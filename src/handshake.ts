import { Socket } from './socket'
import crypto from 'crypto'

const HANDSHAKE_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

type HttpResponse = {
    statusCode: number
    statusText: string
    headers: Record<string, string>
    body?: Buffer
}

function buildRawHttpRequest(method: string, path: string, headers: Record<string, string>) {
    const lines = [`${method} ${path} HTTP/1.1`]
    for (const [k, v] of Object.entries(headers)) 
        lines.push(`${k}: ${v}`)
    lines.push('', '')
    return lines.join('\r\n')
}

export async function client(socket: Socket, url: URL) {
    const key = crypto.randomBytes(16).toString('base64')
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
    const rawResponse = await bufferRead(socket, '\r\n\r\n')
    if (!rawResponse) throw new Error('Handshake ignored')
    const response = parseHttp(rawResponse)
    validateHandshake(response, key)
    return response
}

function bufferRead(socket: Socket, terminator: Buffer | string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        let buffer = Buffer.alloc(0)
        function onData(chunk: Buffer) {            
            buffer = Buffer.concat([buffer, chunk])
            const terminatorIndex = buffer.indexOf(terminator)
            if (terminatorIndex !== -1) {
                socket.off('data', onData)
                resolve(buffer.subarray(0, terminatorIndex + terminator.length))
            }
        }
        socket.on('data', onData)
        socket.on('error', reject)
        socket.on('end', () => reject(new Error('Socket ended before terminator')))
    })
}

function parseHttp(buffer: Buffer) {
    const bufferString = buffer.toString('utf-8')
    const lines = bufferString.split('\r\n')
    let linesPtr = 0
    const statusLine = lines[linesPtr++]
    const match = statusLine.match(/^HTTP\/1\.1 (\d{3}) (.*)$/)
    if (!match) throw new Error('Invalid HTTP status line')
    const statusCode = parseInt(match[1], 10)
    const statusText = match[2]
    const sectionSeparator = '\r\n\r\n'
    const headers: Record<string, string> = {}
    const headerSeparator = ': '
    while (linesPtr < lines.length) {
        const line = lines[linesPtr++]
        if (line.length === 0) break        
        const separatorIndex = line.indexOf(headerSeparator)
        if (separatorIndex === -1) throw new Error('Invalid HTTP header')
        const key = line.slice(0, separatorIndex).toLowerCase()
        const value = line.slice(separatorIndex + headerSeparator.length)
        headers[key] = value
    }

    const body = buffer.includes(sectionSeparator) ? buffer.subarray(bufferString.indexOf(sectionSeparator) + sectionSeparator.length) : undefined
    return {
        statusCode,
        statusText,
        headers,
        body
    }
}

function validateHandshake(response: HttpResponse, key: string) {
    const expectedKey = crypto.createHash('sha1').update(key + HANDSHAKE_GUID).digest('base64')
    if (response.statusCode !== 101) throw new Error('Handshake denied')
    if (response.headers['upgrade'] !== 'websocket') throw new Error('Invalid Upgrade header')
    if (response.headers['connection'] !== 'Upgrade') throw new Error('Invalid Connection header')
    if (response.headers['sec-websocket-accept'] !== expectedKey) throw new Error('Invalid Sec-WebSocket-Accept key')
}
