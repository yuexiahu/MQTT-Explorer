import { readFileSync } from 'fs'
import * as protobuf from 'protobufjs'
import { Base64Message } from './Base64Message';
import { Decoder } from './Decoder';
import { inflateSync, deflateSync } from 'zlib';

export const ZlibDecoder = {
  decode(input: Buffer): Base64Message | undefined {
    try {
      let message = Base64Message.fromBuffer(
        inflateSync(new Uint8Array(input))
      )
      message.decoder = Decoder.ZLIB
      return message
    } catch (e) {
      // ignore
    }
  }
}

export const ZlibEncoder = {
  encode(input: Base64Message): Buffer | undefined {
    try {
      return deflateSync(Base64Message.toUnicodeString(input))
    } catch (e) {
      // ignore
    }
  }
}
