import { connectSocket } from './socket'
import { performHandshake } from './handshake'
import { decodeFrame, encodeCloseFrame, encodeTextFrame, encodeBinaryFrame, encodeFrame, Opcodes } from './frame'
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
    const checkHandshake = performHandshake(socket, url)
    const emitter = new EventEmitter()

    let fragmentBuffer = Buffer.alloc(0)
    let fragmentOpcode: Opcodes | undefined
    let fragmentingInProgress = false
    let buffer = Buffer.alloc(0)
    let lastPing = Date.now()
    let handshakeAccepted = false
    let pingInterval: NodeJS.Timeout
    let closing = false

    const destroy = () => {
        clearInterval(pingInterval)
        socket.end()
    }

    const close = (closeCode: CloseCodes = CloseCodes.NORMAL) => {
        closing = true
        socket.write(encodeCloseFrame(closeCode))
    }

    if (pingIntervalMs > 0) {
        pingInterval = setInterval(() => {
            if (!handshakeAccepted) return
            socket.write(encodeFrame(true, Opcodes.PING, Buffer.alloc(0)))
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
            case Opcodes.BINARY:
                if (frame.fin) {
                    if (fragmentingInProgress) {
                        emitter.emit(Events.ERROR, new Error('non-continuation frame received before previous fragmented message was completed'))
                        close(CloseCodes.PROTOCOL_ERROR)
                        break
                    }
                    emitter.emit(
                        frame.opcode === Opcodes.TEXT ? Events.TEXT : Events.BINARY,
                        frame.opcode === Opcodes.TEXT ? frame.payload.toString(STRING_ENCODING) : frame.payload
                    )
                } else {
                    fragmentingInProgress = true
                    fragmentBuffer = Buffer.concat([fragmentBuffer, frame.payload])
                    fragmentOpcode = frame.opcode
                }
                break
            case Opcodes.CLOSE:
                const closeCode = frame.payload.readUInt16BE(0)
                if (!closing) {
                    close(closeCode)
                } else {
                    emitter.emit(Events.CLOSE, closeCode)
                    destroy()
                }
                break
            case Opcodes.PING:
                socket.write(encodeFrame(true, Opcodes.PONG, frame.payload))
                emitter.emit(Events.PING)
                break
            case Opcodes.PONG:
                emitter.emit(Events.PONG, Date.now() - lastPing)
                break
            case Opcodes.CONTINUATION:
                if (!fragmentingInProgress) {
                    emitter.emit(Events.ERROR, new Error('unexpected CONTINUATION frame'))
                    close(CloseCodes.PROTOCOL_ERROR)
                    break
                }
                fragmentBuffer = Buffer.concat([fragmentBuffer, frame.payload])
                if (frame.fin) {
                    if (fragmentOpcode === Opcodes.TEXT) {
                        emitter.emit(Events.TEXT, fragmentBuffer.toString(STRING_ENCODING))
                    } else if (fragmentOpcode === Opcodes.BINARY) {
                        emitter.emit(Events.BINARY, fragmentBuffer)
                    }
                    fragmentingInProgress = false
                    fragmentBuffer = Buffer.alloc(0)
                    fragmentOpcode = undefined
                }
                break
            default:
                emitter.emit(
                    Events.ERROR,
                    new Error(`reserved or unknown opcode ${frame.opcode}`)
                )
                close(CloseCodes.PROTOCOL_ERROR)
                break
        }
    })

    socket.on('error', error => {
        emitter.emit(Events.ERROR, error)
        destroy()
        emitter.emit(Events.CLOSE, CloseCodes.ABNORMAL_CLOSURE)
    })

    // TODO: Add extensions

    return {
        on: (event: Events, listener: (...args: any[]) => void) => {
            emitter.on(event, listener)
        },
        destroy,
        close,
        write: (data: Buffer | string) => {
            if (!handshakeAccepted) return false
            if (typeof data === 'string') {
                socket.write(encodeTextFrame(data))
                return true
            } else {
                socket.write(encodeBinaryFrame(data))
                return true
            }
        },
    }
}