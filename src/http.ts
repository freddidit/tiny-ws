export const HEADER_SEPARATOR = ': '
export const LINE_SEPARATOR = '\r\n'
export const SECTION_SEPARATOR = '\r\n\r\n'
export const STATUS_LINE_REGEX = /^HTTP\/1\.1 (\d{3}) (.*)$/
export const STRING_ENCODING = 'utf-8'
export const HTTP_VERSION = 'HTTP/1.1'

export function buildRawHttpRequest(method: string, path: string, headers: Record<string, string>) {
    const lines = [`${method} ${path} ${HTTP_VERSION}`]

    for (const [k, v] of Object.entries(headers)) 
        lines.push(`${k}${HEADER_SEPARATOR}${v}`)
    lines.push('', '')

    return lines.join(LINE_SEPARATOR)
}

export function parseHttp(buffer: Buffer) {    
    let linesPtr = 0
    const bufferString = buffer.toString(STRING_ENCODING)
    const lines = bufferString.split(LINE_SEPARATOR)
    const statusLine = lines[linesPtr++]
    const match = statusLine.match(STATUS_LINE_REGEX)
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