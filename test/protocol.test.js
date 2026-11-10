const assert = require('node:assert/strict')
const { test } = require('node:test')
const { countdown, decodeDisplay, elapsedMinutes, loadCountdown, loadPreset, startPreset } = require('../src/protocol')

test('encodes custom durations using four M2 or M3 digits', () => {
  assert.deepEqual(countdown('30'), [70, 77, 22, 22, 94, 22, 25])
  assert.deepEqual(countdown('5:00'), [70, 77, 22, 28, 22, 22, 25])
  assert.deepEqual(countdown('1:39:59'), [70, 77, 74, 74, 28, 74, 25])
  assert.deepEqual(countdown('1:40:00'), [70, 26, 22, 12, 8, 22, 25])
  assert.deepEqual(countdown('99:59:00'), [70, 26, 74, 74, 28, 74, 25])
})

test('rejects invalid and unrepresentable durations before sending commands', () => {
  for (const value of ['', '0', '5:60', '1.5', '99:59:01', '360000']) {
    assert.throws(() => countdown(value), /Enter whole seconds|Countdown must be between/)
  }
  assert.throws(() => countdown('1:40:01'), /must use whole minutes/)
})

test('loads a countdown without starting it', () => {
  assert.deepEqual(loadCountdown('10'), [70, 77, 22, 22, 12, 22])
})

test('stages a saved countdown with one remote keypress', () => {
  assert.deepEqual(loadPreset('m1'), [7])
  assert.deepEqual(loadPreset('m2'), [77])
  assert.deepEqual(loadPreset('m3'), [26])
  assert.throws(() => loadPreset('constructor'), /Choose a timer preset/)
})

test('shows elapsed minutes with the first two digit positions blank through 99', () => {
  assert.deepEqual(elapsedMinutes(40), [70, 26, 8, 22])
  assert.deepEqual(elapsedMinutes(41), [70, 26, 8, 12])
  assert.deepEqual(elapsedMinutes(100), [70, 26, 22, 12, 8, 22])
  assert.throws(() => elapsedMinutes(40.5), /whole number/)
})

test('selects a saved preset and starts it from the clock display', () => {
  assert.deepEqual(startPreset('m1'), [70, 7, 25])
  assert.deepEqual(startPreset('m2'), [70, 77, 25])
  assert.deepEqual(startPreset('m3'), [70, 26, 25])
  assert.deepEqual(startPreset('m4'), [70, 23, 25])
  assert.throws(() => startPreset('constructor'), /Choose a timer preset/)
})

test('decodes the HTML padding used by the firmware', () => {
  assert.equal(decodeDisplay('&nbsp;4:59'), '4:59')
  assert.equal(decodeDisplay('&nbsp;&nbsp;&nbsp;29'), '29')
  assert.equal(decodeDisplay('05:00'), '05:00')
})
