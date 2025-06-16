import { encodeFrame, decodeFrame } from './frame'
import { describe, it, expect } from 'vitest'

describe(decodeFrame, () => {
    it('Decodes a real frame', () => {
        const frame = Buffer.from([0x81,0x05,0x48,0x65,0x6c,0x6c,0x6f])
        const decoded = decodeFrame(frame)
        if (!decoded) throw new Error('Failed to decode frame')
        expect(decoded.fin).toBe(true)
        expect(decoded.opcode).toBe(0x01)
        expect(decoded.payloadLength).toBe(5)
        expect(decoded.bytesConsumed).toBe(frame.length)
        expect(decoded.payload.toString()).toBe('Hello')
    })
})

describe(encodeFrame, () => {
    it('Encodes a frame, and compares it to a real frame', () => {
        const realFrame = Buffer.from([0x81,0x85,0x37,0xfa,0x21,0x3d,0x7f,0x9f,0x4d,0x51,0x58])
        const encoded = encodeFrame(true, 0x01, Buffer.from('Hello'), Buffer.from([0x37,0xfa,0x21,0x3d]))
        expect(encoded).toEqual(realFrame)
    })
})