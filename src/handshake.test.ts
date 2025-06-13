import { client } from './handshake'
import { connect } from './socket'
import { describe, it } from 'vitest'

describe('WebSocket client handshake', () => {
  it('does not throw for echo server', async () => {
    const host = 'echo.websocket.events'
    const url = new URL('wss://' + host + '/')
    const socket = connect(url)
    let error
    try {
      await client(socket, url)
    } catch (err) {
      error = err
    } finally {
      if (socket.destroy) socket.destroy()
    }
    if (error) throw error
  })
})
