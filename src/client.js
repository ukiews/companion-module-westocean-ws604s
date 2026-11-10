const WebSocket = require('ws')
const { setTimeout: delay } = require('node:timers/promises')
const { BACK, MUTE, TOGGLE_DISPLAY, decodeDisplay } = require('./protocol')

const KEY_INTERVAL = 250
const MAX_PENDING_ACTIONS = 4
const HEARTBEAT_INTERVAL = 10000
const RECONNECT_DELAY = 3000
const BLINK_HALF_PERIOD = 500

class ClockClient {
  constructor(url, { status, display }) {
    this.url = url
    this.status = status
    this.display = display
  }

  connect() {
    this.status('connecting')
    const socket = new WebSocket(this.url, { handshakeTimeout: 4000, perMessageDeflate: false, maxPayload: 256 })
    const session = { socket, queue: Promise.resolve(), pending: 0, revision: 0 }
    this.session = session
    let lastDisplay
    let waitingForPong = false

    socket.on('open', () => {
      if (this.session !== session) return
      if (this.mutedForBlink) this.send([BACK]).catch(() => {})
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
      clearInterval(session.blink)
      if (this.session !== session) return
      this.session = undefined
      if (this.closing) return
      this.display('')
      this.status('connection_failure', session.error || 'Clock WebSocket disconnected')
      this.reconnect = setTimeout(() => this.connect(), RECONNECT_DELAY)
    })
  }

  async close() {
    this.closing = true
    clearTimeout(this.reconnect)
    const session = this.session
    if (session) {
      clearInterval(session.blink)
      if (session.socket.readyState === WebSocket.OPEN && (session.pending || this.mutedForBlink)) {
        await session.queue
        if (this.mutedForBlink) {
          await this.restoreSound((code, onSent) => this.key(session, code, onSent)).catch(() => {})
        }
      }
      this.session = undefined
      clearInterval(session.heartbeat)
      session.socket.terminate()
    }
  }

  async send(commands, { blink = false } = {}) {
    const session = this.session
    if (this.closing || session?.socket.readyState !== WebSocket.OPEN) throw new Error('Clock is disconnected')
    if (session.pending >= MAX_PENDING_ACTIONS) throw new Error('Clock is busy')

    const revision = ++session.revision
    clearInterval(session.blink)
    await this.enqueue(session, async (key) => {
      if (blink && !this.mutedForBlink) {
        await key(MUTE, () => { this.mutedForBlink = true })
      } else if (!blink && this.mutedForBlink) {
        await this.restoreSound(key)
        if (commands[0] === BACK) commands = commands.slice(1)
      }

      for (const command of commands) await key(command)

      if (blink && !this.closing && this.session === session && revision === session.revision) {
        session.blink = setInterval(() => {
          if (session.pending === 0) this.enqueue(session, (key) => key(TOGGLE_DISPLAY)).catch(() => {})
        }, BLINK_HALF_PERIOD)
      }
    })
  }

  async restoreSound(key) {
    // Back wakes the screen and exits the timer even if a blink left it dark.
    await key(BACK)
    await key(MUTE, () => { this.mutedForBlink = false })
  }

  async key(session, command, onSent) {
    if (session !== this.session || session.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Clock disconnected during command sequence')
    }
    await new Promise((resolve, reject) => {
      session.socket.send(`#${command}`, (error) => error ? reject(error) : resolve())
    })
    onSent?.()
    await delay(KEY_INTERVAL)
  }

  async enqueue(session, run) {
    session.pending++
    const operation = session.queue.then(() => run((command, onSent) => {
      if (this.closing) throw new Error('Clock connection closed during command sequence')
      return this.key(session, command, onSent)
    }))
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
