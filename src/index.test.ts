import { describe, it } from 'vitest'
import { connectWS } from './index'

describe(connectWS, () => {
    it('Connects to a valid URL', async () => {
        const url = new URL('wss://echo.websocket.org')
        const ws = connectWS(url)
    
        await new Promise<void>((resolve, reject) => {
            ws.on('open', () => {                
                resolve()
            })
            ws.on('error', reject)
        })
    })

    it('Fails on an invalid URL', async () => {
        const url = new URL('loreliushogglefart://echo.websocket.org')
        await new Promise<void>((resolve, reject) => {
            try {connectWS(url)} catch {resolve()} finally {reject()}
        })
    })
})