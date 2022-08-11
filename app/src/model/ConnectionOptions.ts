import { MqttOptions } from '../../../backend/src/DataSource'
import { v4 } from 'uuid'
import { Subscription } from '../../../backend/src/DataSource/MqttSource'
const sha1 = require('sha1')

export interface CertificateParameters {
  name: string
  /** @property data base64 encoded data */
  data: string
}

export interface ConnectionOptions {
  configVersion: 1
  type: 'mqtt'
  id: string
  host: string
  protocol: 'mqtt' | 'ws'
  basePath?: string
  port: number
  name: string
  username?: string
  password?: string
  encryption: boolean
  zlibCompression: boolean
  certValidation: boolean
  selfSignedCertificate?: CertificateParameters
  clientCertificate?: CertificateParameters
  clientKey?: CertificateParameters
  clientId?: string
  subscriptions: Array<Subscription>
}

export function toMqttConnection(options: ConnectionOptions): MqttOptions | undefined {
  if (options.type !== 'mqtt') {
    return
  }

  return {
    url: `${options.protocol}://${options.host}:${options.port}/${options.basePath || ''}`,
    username: options.username,
    password: options.password,
    tls: options.encryption,
    zlibCompression: options.zlibCompression,
    clientId: options.clientId,
    certValidation: options.certValidation,
    subscriptions: options.subscriptions,
    certificateAuthority: options.selfSignedCertificate ? options.selfSignedCertificate.data : undefined,
    clientCertificate: options.clientCertificate ? options.clientCertificate.data : undefined,
    clientKey: options.clientKey ? options.clientKey.data : undefined,
  }
}

function generateClientId() {
  const clientIdSha = sha1(`${Math.random()}`).slice(0, 8)
  return `mqtt-explorer-${clientIdSha}`
}

export function createEmptyConnection(): ConnectionOptions {
  return {
    configVersion: 1,
    certValidation: true,
    clientId: generateClientId(),
    id: v4() as string,
    name: 'new connection',
    encryption: false,
    zlibCompression: false,
    password: undefined,
    username: undefined,
    subscriptions: [
      { topic: '#', qos: 0 },
      { topic: '$SYS/#', qos: 0 },
    ],
    type: 'mqtt',
    host: '',
    port: 1883,
    protocol: 'mqtt',
  }
}

export function makeDefaultConnections() {
  return {
    // remember: there was also iot.eclipse.org once
    'mqtt.eclipse.org': {
      ...createEmptyConnection(),
      id: 'mqtt.eclipse.org',
      name: 'mqtt.eclipse.org',
      host: 'mqtt.eclipse.org',
    },
    'test.mosquitto.org': {
      ...createEmptyConnection(),
      id: 'test.mosquitto.org',
      name: 'test.mosquitto.org',
      host: 'test.mosquitto.org',
    },
  }
}
