const assert = require('node:assert/strict')
const { EventEmitter, once } = require('node:events')
const { test } = require('node:test')
const { WebSocketServer } = require('ws')
const { ClockClient } = require('../src/client')

async function start(t) {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 })
  await once(server, 'listening')
  const events = new EventEmitter()
  const client = new ClockClient(`ws://127.0.0.1:${server.address().port}/`, {
    status: (status) => events.emit(status),
    display: (display) => events.emit('display', display),
  })
  t.after(() => {
    client.close()
    for (const socket of server.clients) socket.terminate()
    server.close()
  })
  const ready = Promise.all([once(server, 'connection'), once(events, 'ok')])
  client.connect()
  const [[socket]] = await ready
  return { client, events, socket }
}

test('serializes button actions and publishes clock display text', { timeout: 5000 }, async (t) => {
  const { client, events, socket } = await start(t)
  const received = []
  socket.on('message', (data) => received.push(data.toString()))
  const display = once(events, 'display')
  socket.send('&nbsp;4:59')
  assert.deepEqual(await display, ['4:59'])

  await Promise.all([client.send([70, 77, 25]), client.send([70])])
  assert.deepEqual(received, ['#70', '#77', '#25', '#70'])
})

test('aborts pending commands if the socket closes mid-action', { timeout: 5000 }, async (t) => {
  const { client, events, socket } = await start(t)
  const failed = once(events, 'connection_failure')
  socket.once('message', () => socket.terminate())
  const actions = Promise.allSettled([client.send([70, 77, 25]), client.send([25])])
  await failed
  assert.deepEqual((await actions).map(({ status }) => status), ['rejected', 'rejected'])
  await assert.rejects(client.send([25]), /disconnected/)
})
