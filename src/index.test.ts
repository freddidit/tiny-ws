import { describe, it } from 'vitest'
import { connectWS, Events } from './index'

const ECHO_SERVER = 'wss://echo.websocket.org'

describe(connectWS, () => {
    it('Connects to a valid URL and pings 5 times', async () => {
        const url = new URL(ECHO_SERVER)
        const ws = connectWS(url, 1000)
    
        await new Promise<void>((resolve, reject) => {
            let counter = 1
            
            ws.on(Events.OPEN, () => {
                console.log('Websocket open')
            })

            ws.on(Events.PONG, rtt => {
                if (counter >= 5) {
                    ws.destroy()
                    resolve()
                }
                
                console.log(`Ping ${counter} | Latency: ${rtt}ms`)
                counter++
            })

            ws.on(Events.ERROR, reject)
        })
    }, 10000)
})