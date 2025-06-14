import { Socket, readUntil } from './socket'
import { buildRawHttpRequest, parseHttp, HttpResponse } from './http'
import crypto from 'crypto'

const HANDSHAKE_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

function generateKey() {
    return crypto.randomBytes(16).toString('base64')
}

function generateExpectedKey(key: string) {
    return crypto.createHash('sha1').update(key + HANDSHAKE_GUID).digest('base64')
}

export async function client(socket: Socket, url: URL) {
    const key = generateKey()
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
    const rawResponse = await readUntil(socket, '\r\n\r\n')
    if (!rawResponse) throw new Error('Handshake ignored')
    const response = parseHttp(rawResponse)
    validateHandshake(response, key)
    return response
}

function validateHandshake(response: HttpResponse, key: string) {    
    if (response.statusCode !== 101) throw new Error('Handshake denied')
    if (response.headers['upgrade'] !== 'websocket') throw new Error('Invalid Upgrade header')
    if (response.headers['connection'] !== 'Upgrade') throw new Error('Invalid Connection header')
    if (response.headers['sec-websocket-accept'] !== generateExpectedKey(key)) throw new Error('Invalid Sec-WebSocket-Accept key')
}
