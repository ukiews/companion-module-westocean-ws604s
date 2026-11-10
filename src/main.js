const { InstanceBase, InstanceStatus, Regex, combineRgb } = require('@companion-module/base')
const { ClockClient } = require('./client')
const { BACK, PLAY_PAUSE, countdown, startPreset } = require('./protocol')

const hostname = new RegExp(Regex.HOSTNAME.slice(1, -1))

class WS604SInstance extends InstanceBase {
  getConfigFields() {
    return [
      { type: 'textinput', id: 'host', label: 'Clock IP address or hostname', width: 8, default: '', regex: Regex.HOSTNAME },
    ]
  }

  async init(config) {
    this.setVariableDefinitions({ display: { name: 'Clock display' } })
    this.setActionDefinitions({
      countdown: {
        name: 'Start countdown',
        options: [{ type: 'textinput', id: 'duration', label: 'Duration (seconds, M:SS, or H:MM:SS)', default: '5:00' }],
        callback: ({ options }) => this.run(() => countdown(options.duration)),
      },
      start_preset: {
        name: 'Start saved countdown preset',
        options: [{
          type: 'dropdown', id: 'preset', label: 'Preset', default: 'm2',
          choices: [
            { id: 'm1', label: 'M1 · Seconds' },
            { id: 'm2', label: 'M2 · Minutes' },
            { id: 'm3', label: 'M3 · Hours' },
          ],
        }],
        callback: ({ options }) => this.run(() => startPreset(options.preset)),
      },
      stopwatch: {
        name: 'Start stopwatch (M4)',
        options: [],
        callback: () => this.run(() => startPreset('m4')),
      },
      play_pause: {
        name: 'Pause / resume timer',
        options: [],
        callback: () => this.run(() => [PLAY_PAUSE]),
      },
      cancel: {
        name: 'Cancel timer and show time',
        options: [],
        callback: () => this.run(() => [BACK]),
      },
    })
    this.definePresets()
    await this.configUpdated(config)
  }

  async configUpdated(config) {
    this.client?.close()
    this.client = undefined
    this.setVariableValues({ display: '' })
    const host = String(config.host ?? '').trim()
    let url
    try {
      if (hostname.test(host)) url = new URL(`ws://${host}:81/`)
    } catch {
      // URL also validates numeric IPv4 addresses.
    }
    if (!url) {
      this.updateStatus(InstanceStatus.BadConfig, 'Enter the clock IP address or hostname')
      return
    }
    this.client = new ClockClient(url.href, {
      status: (status, message) => this.updateStatus(status, message),
      display: (display) => this.setVariableValues({ display }),
    })
    this.client.connect()
  }

  async destroy() {
    this.client?.close()
    this.client = undefined
  }

  async run(buildCommands) {
    try {
      const commands = buildCommands()
      if (!this.client) throw new Error('Configure the clock address first')
      await this.client.send(commands)
    } catch (error) {
      this.log('warn', error.message)
    }
  }

  definePresets() {
    const presets = {}
    for (const [id, name, text, actionId, options, rgb] of [
      ['start_30s', 'Start 30-second countdown', 'Start\n0:30', 'countdown', { duration: '0:30' }, [0, 86, 47]],
      ['start_5m', 'Start five-minute countdown', 'Start\n5:00', 'countdown', { duration: '5:00' }, [0, 86, 47]],
      ['start_10m', 'Start ten-minute countdown', 'Start\n10:00', 'countdown', { duration: '10:00' }, [0, 86, 47]],
      ['play_pause', 'Pause / resume', 'Pause /\nResume', 'play_pause', {}, [37, 65, 128]],
      ['cancel', 'Cancel timer and show time', 'Cancel\nTimer', 'cancel', {}, [128, 30, 30]],
      ['display', 'Mirror clock display', '$(self:display)', null, {}, [30, 30, 30]],
    ]) {
      presets[id] = {
        type: 'simple',
        name,
        style: { text, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(...rgb) },
        steps: [{ down: actionId ? [{ actionId, options }] : [], up: [] }],
        feedbacks: [],
      }
    }
    this.setPresetDefinitions([{ id: 'timers', name: 'Timer controls', definitions: Object.keys(presets) }], presets)
  }
}

module.exports = WS604SInstance
