import { connectSocket } from './socket'
import { performHandshake } from './handshake'
import { decodeFrame, encodeFrame, Opcodes } from './frame'
import { STRING_ENCODING } from './http'
import { EventEmitter } from 'events'

export enum Events {
    OPEN = 'open',
    CLOSE = 'close',
    TEXT = 'text',
    BINARY = 'binary',
    PING = 'ping',
    PONG = 'pong',
    ERROR = 'error',
}

export enum CloseCodes {
    NORMAL = 1000,
    GOING_AWAY = 1001,
    PROTOCOL_ERROR = 1002,
    UNEXPECTED_CONDITION = 1003,
    ABNORMAL_CLOSURE = 1006,
    INVALID_FRAME_PAYLOAD_DATA = 1007,
    POLICY_VIOLATION = 1008,
    MESSAGE_TOO_BIG = 1009,
}

export function connectWS(url: URL, pingIntervalMs: number = 10000) {
    const socket = connectSocket(url)
    const emitter = new EventEmitter()
    const checkHandshake = performHandshake(socket, url)

    let lastPing = Date.now()
    let handshakeAccepted = false
    let buffer = Buffer.alloc(0)
    let pingInterval: NodeJS.Timeout
    let receivedClose = false

    if (pingIntervalMs > 0) {
        pingInterval = setInterval(() => {
            if (!handshakeAccepted) return
            const pingFrame = encodeFrame(true, Opcodes.PING, Buffer.alloc(0))
            socket.write(pingFrame)
            lastPing = Date.now()          
        }, pingIntervalMs)
    }
    
    socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk])

        if (!handshakeAccepted) {
            const handshakeBytes = checkHandshake(buffer)

            if (handshakeBytes > 0) {
                buffer = buffer.subarray(handshakeBytes)
                emitter.emit(Events.OPEN)
                handshakeAccepted = true
            } else return
        }

        const frame = decodeFrame(buffer)

        if (!frame) return

        buffer = buffer.subarray(frame.bytesConsumed)
        
        switch (frame.opcode) {
            case Opcodes.TEXT:
                emitter.emit(Events.TEXT, frame.payload.toString(STRING_ENCODING))
                break

            case Opcodes.BINARY:
                emitter.emit(Events.BINARY, frame.payload)
                break                        
                
            case Opcodes.CLOSE:
                const payload = Buffer.alloc(2)
                payload.writeUInt16BE(CloseCodes.NORMAL)
                const closeFrame = encodeFrame(true, Opcodes.CLOSE, payload)
                socket.write(closeFrame)
                socket.end()
                const closeCode = frame.payload.readUInt16BE(0)
                emitter.emit(Events.CLOSE, closeCode)                
                receivedClose = true
                break            

            case Opcodes.PING:
                const pongFrame = encodeFrame(true, Opcodes.PONG, frame.payload)
                socket.write(pongFrame)                
                emitter.emit(Events.PING)
                break

            case Opcodes.PONG:
                const rtt = Date.now() - lastPing
                emitter.emit(Events.PONG, rtt)
                break
        }
    })

    socket.on('error', error => {
        emitter.emit(Events.ERROR, error)
    })

    socket.on('close', () => {
        clearInterval(pingInterval)
        if (!receivedClose) emitter.emit(Events.CLOSE, CloseCodes.ABNORMAL_CLOSURE)
    })
    // TODO: Fragmentation
    
    return emitter
}