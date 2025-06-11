import { connect as connectTls, TLSSocket } from 'tls'
import { connect as connectNet, Socket } from 'net'
import { randomBytes } from 'crypto'

export type Credentials = {
    path: string,
    port: number,
    secure: boolean,
    host: string
}

export function parseUrl(urlString: string) {
    const url = URL.parse(urlString)
    
    if (!url) return
    
    const credentials = {} as Credentials
    const protocol = url.protocol
    
    if (protocol === 'wss:') credentials.secure = true
    else if (protocol === 'ws:') credentials.secure = false
    else throw new Error(`Invalid protocol ${protocol} (ws: | wss:)`)
    
    credentials.port = parseInt(url.port) || (credentials.secure ? 443 : 80)
    credentials.path = url.pathname || '/'
    credentials.host = url.hostname
    
    return credentials
}

export function clientHandshake(socket: TLSSocket | Socket, credentials: Credentials) {
    const key = randomBytes(16).toString('base64')    
    const request = [
        `GET ${credentials.path} HTTP/1.1`,
        `Host: ${credentials.host}:${credentials.port}`,
        `Upgrade: websocket`,
        `Connection: Upgrade`,
        `Sec-WebSocket-Key: ${key}`,
        `Sec-WebSocket-Version: 13`,
        '', 
        ''
  ].join('\r\n')

  socket.write(request)
}

export function connect(urlString: string) {
    const credentials = parseUrl(urlString)    
    if (!credentials) throw new Error('Failed to parse URL')
    if (credentials.secure) 
        return connectTls(credentials)
    else 
        return connectNet(credentials)        
}
