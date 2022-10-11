import { Base64Message } from './Model/Base64Message'
import { DataSource, MqttSource } from './DataSource'
import {
  AddMqttConnection,
  MqttMessage,
  addMqttConnectionEvent,
  backendEvents,
  makeConnectionMessageEvent,
  makeConnectionStateEvent,
  makePublishEvent,
  removeConnection,
} from '../../events'
import { SparkplugDecoder } from './Model/sparkplugb'
import { ZlibDecoder, ZlibEncoder } from './Model/zlibCodec'

export class ConnectionManager {
  private connections: { [s: string]: DataSource<any> } = {}

  private zlibCompression: boolean = false

  private handleConnectionRequest = (event: AddMqttConnection) => {
    const connectionId = event.id

    // Prevent double connections when reloading
    if (this.connections[connectionId]) {
      this.removeConnection(connectionId)
    }

    const options = event.options
    const connection = new MqttSource()
    this.connections[connectionId] = connection
    this.zlibCompression = options.zlibCompression

    const connectionStateEvent = makeConnectionStateEvent(connectionId)
    connection.stateMachine.onUpdate.subscribe(state => {
      backendEvents.emit(connectionStateEvent, state)
    })

    connection.connect(options)
    this.handleNewMessagesForConnection(connectionId, connection)
    backendEvents.subscribe(makePublishEvent(connectionId), (msg: MqttMessage) => {
      if (this.zlibCompression && msg.payload) {
        msg.rawPayload = ZlibEncoder.encode(msg.payload)
      }
      this.connections[connectionId].publish(msg)
    })
  }

  private handleNewMessagesForConnection(connectionId: string, connection: MqttSource) {
    const messageEvent = makeConnectionMessageEvent(connectionId)
    connection.onMessage((topic: string, payload: Buffer, packet: any) => {
      let buffer = payload
      const lengthLimit = 1024*1000;
      if (buffer.length > lengthLimit) {
        buffer = buffer.slice(0, lengthLimit)
      }

      backendEvents.emit(messageEvent, {
        topic,
        payload: this.zlibCompression && ZlibDecoder.decode(buffer) || Base64Message.fromBuffer(buffer),
        qos: packet.qos,
        retain: packet.retain,
        messageId: packet.messageId,
      })
    })
  }

  public manageConnections() {
    backendEvents.subscribe(addMqttConnectionEvent, this.handleConnectionRequest)
    backendEvents.subscribe(removeConnection, (connectionId: string) => {
      this.removeConnection(connectionId)
    })
  }

  public removeConnection(connectionId: string) {
    const connection = this.connections[connectionId]
    if (connection) {
      backendEvents.unsubscribeAll(makePublishEvent(connectionId))
      connection.disconnect()
      delete this.connections[connectionId]
      connection.stateMachine.onUpdate.removeAllListeners()
    }
  }

  public closeAllConnections() {
    Object.keys(this.connections).forEach(connectionId => this.removeConnection(connectionId))
  }
}
