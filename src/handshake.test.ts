import { client } from './handshake'
import { connect } from './socket'
import { describe, it } from 'vitest'

describe('WebSocket client handshake', () => {
  it('Connects to an echo websocket server', async () => {    
    const url = new URL('wss://' + 'echo.websocket.events' + '/')
    const socket = connect(url)    
    await client(socket, url)    
  })
})
