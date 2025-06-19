import crypto from 'crypto'
import { STRING_ENCODING } from './http'

export enum Opcodes {
    CONTINUATION = 0x0,
    TEXT = 0x1,
    BINARY = 0x2,
    CLOSE = 0x8,
    PING = 0x9,
    PONG = 0xa,    
}

export function decodeFrame(buffer: Buffer) {
    if (buffer.length < 2) return
    
    let ptr = 0
    const byte0 = buffer[ptr++]
    const byte1 = buffer[ptr++]
    const fin = !!(byte0 & 0x80)
    const opcode = (byte0 & 0x0f) as Opcodes
    let payloadLength = byte1 & 0x7f    

    if (payloadLength === 126) {
        const oldPtr = ptr
        ptr += 2
        if (buffer.length < ptr) return
        payloadLength = buffer.readUInt16BE(oldPtr)        
    } else if (payloadLength === 127) {
        const oldPtr = ptr
        ptr += 8
        if (buffer.length < ptr) return        
        payloadLength = Number(buffer.readBigUInt64BE(oldPtr))        
    }
        
    const oldPtr = ptr
    ptr += payloadLength

    if (buffer.length < ptr) return
    
    const payload = buffer.subarray(oldPtr, ptr)            

    return { fin, opcode, payloadLength, bytesConsumed: ptr, payload }
}

export function encodeFrame(fin: boolean, opcode: Opcodes, payload: Buffer, maskingKey: Buffer = crypto.randomBytes(4)) {
    const maskBit = 0x80
    const payloadLength = payload.length < 126 ? payload.length : payload.length < 0x10000 ? 126 : 127
    const byte0 = (fin ? 0x80 : 0x00) | opcode
    const byte1 = maskBit | payloadLength
    let frame = Buffer.from([byte0, byte1])

    if (payloadLength === 126) {
        const ext = Buffer.alloc(2)
        ext.writeUInt16BE(payload.length, 0)
        frame = Buffer.concat([frame, ext])
    } else if (payloadLength === 127) {
        const ext = Buffer.alloc(8)
        ext.writeBigUInt64BE(BigInt(payload.length), 0)
        frame = Buffer.concat([frame, ext])
    }
    
    const maskedPayload = Buffer.alloc(payload.length)

    for (let i = 0; i < payload.length; i++) {
        maskedPayload[i] = payload[i] ^ maskingKey[i % 4]
    }

    frame = Buffer.concat([frame, maskingKey, maskedPayload])

    return frame
}

export function encodeCloseFrame(code: number) {
    const payload = Buffer.alloc(2)
    payload.writeUInt16BE(code)
    return encodeFrame(true, Opcodes.CLOSE, payload)
}

export function encodeTextFrame(text: string) {
    // TODO: fragment maybe    
    return encodeFrame(true, Opcodes.TEXT, Buffer.from(text, STRING_ENCODING))
}

export function encodeBinaryFrame(binary: Buffer) {
    // TODO: fragment maybe
    return encodeFrame(true, Opcodes.BINARY, binary)
}

