import crypto from 'crypto'
import { Socket } from './socket'
import { buildRawHttpRequest, parseHttp, SECTION_SEPARATOR } from './http'

const HANDSHAKE_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

export function performHandshake(socket: Socket, url: URL) {
    const key = crypto.randomBytes(16).toString('base64')
    const expectedKey = crypto.createHash('sha1').update(key + HANDSHAKE_GUID).digest('base64')

    socket.write(
        buildRawHttpRequest(
            'GET',
            url.pathname + url.search,
            {
                Host: url.host,
                Connection: 'Upgrade',
                Upgrade: 'websocket',
                Origin: `${url.protocol}//${url.host}`,
                'Sec-WebSocket-Key': key,
                'Sec-WebSocket-Version': '13'
            }
        )
    )
                
    return (buffer: Buffer) => {
        const terminatorIndex = buffer.indexOf(SECTION_SEPARATOR)        

        if (terminatorIndex === -1) return -1

        const bytesConsumed = terminatorIndex + 4
        const response = parseHttp(buffer.subarray(0, bytesConsumed))

        if (response.statusCode !== 101) throw new Error('Handshake denied')
        if (response.headers['upgrade'] !== 'websocket') throw new Error('Invalid Upgrade header')
        if (response.headers['connection'] !== 'Upgrade') throw new Error('Invalid Connection header')
        if (response.headers['sec-websocket-accept'] !== expectedKey) throw new Error('Invalid Sec-WebSocket-Accept key')        

        return bytesConsumed
    }
}