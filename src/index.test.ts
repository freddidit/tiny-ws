import { expect, test } from 'vitest'
import { Credentials, parseUrl } from './index'

test('Parses a websocket URL', () => {
    const credentials: Credentials = {
        path: '/',
        port: 8080,
        secure: false,
        host: 'localhost'
    }
    expect(parseUrl('ws://localhost:8080')).toStrictEqual(credentials)
})