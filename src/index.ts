export type Credentials = {
    path: string,
    port: string,
    secure: boolean,
    host: string
}

export function parseUrl(urlString: string): Credentials | undefined {
    const url = URL.parse(urlString)

    if (!url) return

    const credentials = {} as Credentials
    const protocol = url.protocol

    if (protocol === 'wss:') credentials.secure = true
    else if (protocol === 'ws:') credentials.secure = false
    else throw new Error(`Invalid protocol ${protocol} (ws: | wss:)`)

    credentials.port = url.port || (credentials.secure ? '443' : '80')
    credentials.path = url.pathname || '/'
    credentials.host = url.hostname

    return credentials
}