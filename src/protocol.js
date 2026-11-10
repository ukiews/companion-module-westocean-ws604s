const BACK = 70
const PLAY_PAUSE = 25
const MUTE = 71
const TOGGLE_DISPLAY = 69
const PRESET = { m1: 7, m2: 77, m3: 26, m4: 23 }
const DIGITS = [22, 12, 24, 94, 8, 28, 90, 66, 82, 74]

function startPreset(preset) {
  if (!Object.hasOwn(PRESET, preset)) throw new Error('Choose a timer preset')
  return [BACK, PRESET[preset], PLAY_PAUSE]
}

function timerDigits(units) {
  return String(Math.floor(units / 60)).padStart(2, '0') + String(units % 60).padStart(2, '0')
}

function loadCountdown(value) {
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
  return [BACK, long ? PRESET.m3 : PRESET.m2, ...Array.from(timerDigits(units), (digit) => DIGITS[digit])]
}

function countdown(value) {
  return [...loadCountdown(value), PLAY_PAUSE]
}

function elapsedMinutes(minutes) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 99 * 60 + 59) {
    throw new Error('Enter a whole number of elapsed minutes from 0 to 5999')
  }
  // Leaving M3 in numeric entry holds the value. With two digits the hour positions stay blank.
  const digits = minutes < 100 ? String(minutes).padStart(2, '0') : timerDigits(minutes)
  return [BACK, PRESET.m3, ...Array.from(digits, (digit) => DIGITS[digit])]
}

function decodeDisplay(data) {
  // The remote console sends the same text shown on the four-digit LED, with HTML spaces.
  return data.replaceAll('&nbsp;', ' ').trim()
}

module.exports = { BACK, PLAY_PAUSE, MUTE, TOGGLE_DISPLAY, countdown, decodeDisplay, elapsedMinutes, loadCountdown, startPreset }
