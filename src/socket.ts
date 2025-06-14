import net from 'net'
import tls from 'tls'

export type Socket = tls.TLSSocket | net.Socket

const SAFE_PROTOCOL = 'wss:'
const UNSAFE_PROTOCOL = 'ws:'
const ACCEPTED_PROTOCOLS = [SAFE_PROTOCOL, UNSAFE_PROTOCOL]

function urlToOptions(url: URL) {
    return {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 443,
        servername: url.hostname
    }
}

export function connect(url: URL) {
    const protocol = url.protocol
    const isSafe = url.protocol === SAFE_PROTOCOL
    const isAcceptedProtocol = ACCEPTED_PROTOCOLS.includes(protocol)
    if (!isAcceptedProtocol)
        throw new Error(`Unknown protocol ${protocol}`)
    const options = urlToOptions(url)
    return isSafe ? tls.connect(options) : net.connect(options)
}

export function readUntil(socket: Socket, terminator: Buffer | string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        let buffer = Buffer.alloc(0)
        function onData(chunk: Buffer) {            
            buffer = Buffer.concat([buffer, chunk])
            const terminatorIndex = buffer.indexOf(terminator)
            if (terminatorIndex === -1) return
            socket.off('data', onData)
            resolve(buffer.subarray(0, terminatorIndex + terminator.length))    
        }
        socket.on('data', onData)
        socket.on('error', reject)
        socket.on('end', () => reject(new Error('Socket ended before terminator')))
    })
}