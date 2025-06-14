import { describe, it, expect } from 'vitest'
import { parseHttp } from './http'

describe('parseHttp (real HTTP responses)', () => {
  it('parses a real 200 OK response', () => {
    const raw = Buffer.from(
      'HTTP/1.1 200 OK\r\n' +
      'Date: Sun, 01 Jan 2023 00:00:00 GMT\r\n' +
      'Content-Type: text/html; charset=UTF-8\r\n' +
      'Content-Length: 13\r\n' +
      'Connection: keep-alive\r\n' +
      '\r\n' +
      'Hello, world!'
    )
    const res = parseHttp(raw)
    expect(res.statusCode).toBe(200)
    expect(res.statusText).toBe('OK')
    expect(res.headers['date']).toBe('Sun, 01 Jan 2023 00:00:00 GMT')
    expect(res.headers['content-type']).toBe('text/html; charset=UTF-8')
    expect(res.headers['content-length']).toBe('13')
    expect(res.body?.toString()).toBe('Hello, world!')
  })

  it('parses a real 404 Not Found response', () => {
    const raw = Buffer.from(
      'HTTP/1.1 404 Not Found\r\n' +
      'Date: Sun, 01 Jan 2023 00:00:00 GMT\r\n' +
      'Content-Type: text/html; charset=UTF-8\r\n' +
      'Content-Length: 9\r\n' +
      'Connection: close\r\n' +
      '\r\n' +
      'Not found'
    )
    const res = parseHttp(raw)
    expect(res.statusCode).toBe(404)
    expect(res.statusText).toBe('Not Found')
    expect(res.headers['date']).toBe('Sun, 01 Jan 2023 00:00:00 GMT')
    expect(res.headers['content-type']).toBe('text/html; charset=UTF-8')
    expect(res.headers['content-length']).toBe('9')
    expect(res.body?.toString()).toBe('Not found')
  })

  it('parses a real response with multiple headers and a longer body', () => {
    const body = '<html><body><h1>Example Domain</h1></body></html>'
    const raw = Buffer.from(
      'HTTP/1.1 200 OK\r\n' +
      'Date: Mon, 02 Jan 2023 12:34:56 GMT\r\n' +
      'Content-Type: text/html; charset=UTF-8\r\n' +
      'Content-Length: ' + body.length + '\r\n' +
      'Connection: keep-alive\r\n' +
      'X-Custom-Header: abc123\r\n' +
      '\r\n' +
      body
    )
    const res = parseHttp(raw)
    expect(res.statusCode).toBe(200)
    expect(res.statusText).toBe('OK')
    expect(res.headers['date']).toBe('Mon, 02 Jan 2023 12:34:56 GMT')
    expect(res.headers['content-type']).toBe('text/html; charset=UTF-8')
    expect(res.headers['content-length']).toBe(String(body.length))
    expect(res.headers['x-custom-header']).toBe('abc123')
    expect(res.body?.toString()).toBe(body)
  })
})
