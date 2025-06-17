import { connectSocket } from './socket'
import { performHandshake } from './handshake'
import { EventEmitter } from 'events'

export function connectWS(url: URL) {
    const socket = connectSocket(url)
    const emitter = new EventEmitter()
    const checkHandshake = performHandshake(socket, url)
    let buffer = Buffer.alloc(0)

    socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk])
        const handshakeBytes = checkHandshake(buffer)
        if (handshakeBytes > 0) {
            buffer = buffer.subarray(handshakeBytes)
            emitter.emit('open')
        }
    })

    socket.on('error', error => {
        emitter.emit('error', error)
    })
    
    socket.on('close', () => {
        emitter.emit('close')
    })

    return emitter
}