import { describe, it, expect } from 'vitest'
import { decodeFrame } from './frame'

describe('decodeFrame (raw WebSocket frames)', () => {
  it('decodes an unmasked text frame ("hello")', () => {
    const frame = Buffer.from([0x81, 0x05, 0x68, 0x65, 0x6c, 0x6c, 0x6f])
    const res = decodeFrame(frame)
    expect(res?.payload.toString()).toBe('hello')
    expect(res?.fin).toBe(true)
    expect(res?.opcode).toBe(1)
    expect(res?.mask).toBeUndefined()
    expect(res?.bytesConsumed).toBe(frame.length)
  })

  it('decodes a masked text frame ("world")', () => {
    // Masking key: 0x12, 0x34, 0x56, 0x78; payload: 'world'
    // Masked: [0x65, 0x5b, 0x24, 0x14, 0x76]
    const frame = Buffer.from([0x81, 0x85, 0x12, 0x34, 0x56, 0x78, 0x65, 0x5b, 0x24, 0x14, 0x76])
    const res = decodeFrame(frame)
    expect(res?.payload.toString()).toBe('world')
    expect(res?.fin).toBe(true)
    expect(res?.opcode).toBe(1)
    expect(res?.mask).toBeInstanceOf(Buffer)
    expect(res?.bytesConsumed).toBe(frame.length)
  })

  it('decodes a frame with extended payload length (126)', () => {
    const payload = Buffer.alloc(130, 0x61)
    const frame = Buffer.concat([Buffer.from([0x82, 0x7e, 0x00, 0x82]), payload])
    const res = decodeFrame(frame)
    expect(res?.payload.equals(payload)).toBe(true)
    expect(res?.fin).toBe(true)
    expect(res?.opcode).toBe(2)
    expect(res?.mask).toBeUndefined()
    expect(res?.bytesConsumed).toBe(frame.length)
  })

  it('decodes a frame with extended payload length (127)', () => {
    const frame = Buffer.from([
      0x81, 0x7f,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
      0x62, 0x69, 0x67
    ])
    const res = decodeFrame(frame)
    expect(res?.payload.toString()).toBe('big')
    expect(res?.fin).toBe(true)
    expect(res?.opcode).toBe(1)
    expect(res?.mask).toBeUndefined()
    expect(res?.bytesConsumed).toBe(frame.length)
  })
})
