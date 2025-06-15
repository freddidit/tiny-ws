
export function decodeFrame(buffer: Buffer) {
    if (buffer.length < 2) return

    // Get frame header
    let ptr = 0
    const byte0 = buffer[ptr++]
    const byte1 = buffer[ptr++]
    const fin = !!(byte0 & 0x80)
    const opcode = byte0 & 0x0f
    const isMasked = !!(byte1 & 0x80)
    let payloadSize = byte1 & 0x7f
    let mask: Buffer | undefined

    // Get real payload size
    if (payloadSize === 126) {
        const payloadSizeLength = ptr + 2
        if (buffer.length < payloadSizeLength) return
        payloadSize = buffer.readUInt16BE(ptr)
        ptr = payloadSizeLength
    } else if (payloadSize === 127) {
        const payloadSizeLength = ptr + 8
        if (buffer.length < payloadSizeLength) return        
        payloadSize = Number(buffer.readBigUInt64BE(ptr))
        ptr = payloadSizeLength
    }
    
    // Get mask
    if (isMasked) {
        const maskLength = ptr + 4
        if (buffer.length < maskLength) return
        mask = buffer.subarray(ptr, maskLength)
        ptr = maskLength
    }

    const payloadLength = ptr + payloadSize

    if (buffer.length < payloadLength) return

    // Get payload
    const payload = buffer.subarray(ptr, payloadLength)    
    ptr = payloadLength

    // Unmask payload
    if (isMasked && mask) {
        for (let i = 0; i < payload.length; ++i) {
            payload[i] ^= mask[i % 4]
        }
    }

    return { fin, opcode, mask, payloadSize, bytesConsumed: ptr, payload }
}