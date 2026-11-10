const WebSocket = require('ws')
const { setTimeout: delay } = require('node:timers/promises')
const { decodeDisplay } = require('./protocol')

const KEY_INTERVAL = 250
const MAX_PENDING_ACTIONS = 4
const HEARTBEAT_INTERVAL = 10000
const RECONNECT_DELAY = 3000

class ClockClient {
  constructor(url, { status, display }) {
    this.url = url
    this.status = status
    this.display = display
  }

  connect() {
    this.status('connecting')
    const socket = new WebSocket(this.url, { handshakeTimeout: 4000, perMessageDeflate: false, maxPayload: 256 })
    const session = { socket, queue: Promise.resolve(), pending: 0 }
    this.session = session
    let lastDisplay
    let waitingForPong = false

    socket.on('open', () => {
      if (this.session !== session) return
      this.status('ok')
      session.heartbeat = setInterval(() => {
        if (waitingForPong) {
          socket.terminate()
          return
        }
        waitingForPong = true
        socket.ping()
      }, HEARTBEAT_INTERVAL)
    })
    socket.on('pong', () => { waitingForPong = false })
    socket.on('message', (data, isBinary) => {
      if (this.session !== session || isBinary) return
      const display = decodeDisplay(data.toString())
      if (display !== lastDisplay) {
        lastDisplay = display
        this.display(display)
      }
    })
    // WebSocket transport errors are followed by close.
    socket.on('error', (error) => { session.error = error.message })
    socket.on('close', () => {
      clearInterval(session.heartbeat)
      if (this.session !== session) return
      this.session = undefined
      this.display('')
      this.status('connection_failure', session.error || 'Clock WebSocket disconnected')
      this.reconnect = setTimeout(() => this.connect(), RECONNECT_DELAY)
    })
  }

  close() {
    clearTimeout(this.reconnect)
    const session = this.session
    this.session = undefined
    if (session) {
      clearInterval(session.heartbeat)
      session.socket.terminate()
    }
  }

  async send(commands) {
    const session = this.session
    if (session?.socket.readyState !== WebSocket.OPEN) throw new Error('Clock is disconnected')
    if (session.pending >= MAX_PENDING_ACTIONS) throw new Error('Clock is busy')

    session.pending++
    const operation = session.queue.then(async () => {
      for (const command of commands) {
        if (session !== this.session || session.socket.readyState !== WebSocket.OPEN) {
          throw new Error('Clock disconnected during command sequence')
        }
        await new Promise((resolve, reject) => {
          session.socket.send(`#${command}`, (error) => error ? reject(error) : resolve())
        })
        await delay(KEY_INTERVAL)
      }
    })
    // Keep actions in order, including the spacing between different button presses.
    session.queue = operation.catch(() => {})
    try {
      await operation
    } finally {
      session.pending--
    }
  }
}

module.exports = { ClockClient }
