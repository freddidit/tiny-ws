import { Socket } from './socket'
import crypto from 'crypto'

function buildRawHttpRequest(method: string, path: string, headers: Record<string, string>) {
    const lines = [`${method} ${path} HTTP/1.1`]
    for (const [k, v] of Object.entries(headers)) 
        lines.push(`${k}: ${v}`)
    lines.push('', '')
    return lines.join('\r\n')
}

export function client(socket: Socket, url: URL) {
    const key = crypto.randomBytes(16).toString('base64')    
    const success = socket.write(
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
    return {
        success,
        key
    }
}