const HEADER_SEPARATOR = ': '
const SECTION_SEPARATOR = '\r\n\r\n'

export type HttpResponse = {
    statusCode: number
    statusText: string
    headers: Record<string, string>
    body?: Buffer
}

export function buildRawHttpRequest(method: string, path: string, headers: Record<string, string>) {
    const lines = [`${method} ${path} HTTP/1.1`]

    for (const [k, v] of Object.entries(headers)) 
        lines.push(`${k}: ${v}`)
    lines.push('', '')

    return lines.join('\r\n')
}

export function parseHttp(buffer: Buffer) {    
    let linesPtr = 0
    const bufferString = buffer.toString('utf-8')
    const lines = bufferString.split('\r\n')
    const statusLine = lines[linesPtr++]
    const match = statusLine.match(/^HTTP\/1\.1 (\d{3}) (.*)$/)
    const headers: Record<string, string> = {}
    
    if (!match) throw new Error('Invalid HTTP status line')
    while (linesPtr < lines.length) {
        const line = lines[linesPtr++]
        const separatorIndex = line.indexOf(HEADER_SEPARATOR)

        if (line.length === 0) break        
        if (separatorIndex === -1) throw new Error('Invalid HTTP header')

        const key = line.slice(0, separatorIndex).toLowerCase()
        const value = line.slice(separatorIndex + HEADER_SEPARATOR.length)

        headers[key] = value
    }
    
    return {
        headers,
        statusCode: parseInt(match[1], 10),
        statusText: match[2],
        body: buffer.includes(SECTION_SEPARATOR) ? buffer.subarray(bufferString.indexOf(SECTION_SEPARATOR) + SECTION_SEPARATOR.length) : undefined
    }
}