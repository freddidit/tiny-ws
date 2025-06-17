import net from 'net'
import tls from 'tls'

export type Socket = tls.TLSSocket | net.Socket

const SAFE_PROTOCOL = 'wss:'
const UNSAFE_PROTOCOL = 'ws:'
const ACCEPTED_PROTOCOLS = [SAFE_PROTOCOL, UNSAFE_PROTOCOL]
const DEFAULT_PORT = 443

export function connectSocket(url: URL) {
    const protocol = url.protocol
    const isSafe = url.protocol === SAFE_PROTOCOL
    const isAcceptedProtocol = ACCEPTED_PROTOCOLS.includes(protocol)
    
    if (!isAcceptedProtocol)
        throw new Error(`Unknown protocol ${protocol}`)

    const options = {
        host: url.hostname,
        port: url.port ? parseInt(url.port) : DEFAULT_PORT,
        servername: url.hostname
    }

    return isSafe ? tls.connect(options) : net.connect(options)
}