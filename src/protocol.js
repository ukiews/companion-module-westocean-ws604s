const BACK = 70
const PLAY_PAUSE = 25
const PRESET = { m1: 7, m2: 77, m3: 26, m4: 23 }
const DIGITS = [22, 12, 24, 94, 8, 28, 90, 66, 82, 74]

function startPreset(preset) {
  if (!Object.hasOwn(PRESET, preset)) throw new Error('Choose a timer preset')
  return [BACK, PRESET[preset], PLAY_PAUSE]
}

function countdown(value) {
  const duration = String(value ?? '').trim()
  let seconds
  if (/^\d{1,6}$/.test(duration)) {
    seconds = Number(duration)
  } else if (/^\d{1,2}(?::[0-5]\d){1,2}$/.test(duration)) {
    seconds = duration.split(':').reduce((total, part) => total * 60 + Number(part), 0)
  } else {
    throw new Error('Enter whole seconds, M:SS, or H:MM:SS')
  }

  if (seconds < 1 || seconds > 99 * 3600 + 59 * 60) {
    throw new Error('Countdown must be between 1 second and 99 hours 59 minutes')
  }
  const long = seconds >= 100 * 60
  if (long && seconds % 60 !== 0) {
    throw new Error('Countdowns of 100 minutes or more must use whole minutes')
  }

  // M2 edits MM:SS. M3 edits HH:MM. Four keystrokes replace the preset temporarily.
  const units = long ? seconds / 60 : seconds
  const digits = String(Math.floor(units / 60)).padStart(2, '0') + String(units % 60).padStart(2, '0')
  return [BACK, long ? PRESET.m3 : PRESET.m2, ...Array.from(digits, (digit) => DIGITS[digit]), PLAY_PAUSE]
}

function decodeDisplay(data) {
  // The remote console sends the same text shown on the four-digit LED, with HTML spaces.
  return data.replaceAll('&nbsp;', ' ').trim()
}

module.exports = { BACK, PLAY_PAUSE, countdown, decodeDisplay, startPreset }
