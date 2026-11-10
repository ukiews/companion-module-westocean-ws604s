# West Ocean WS-604S for Bitfocus Companion

Start countdowns on the physical WS-604S wall clock from a Stream Deck button or Companion trigger. The module uses the clock's built-in Remote Console over WebSocket and mirrors the four-digit display.

## Install

1. Download the `westocean-ws604s-*.tgz` asset from the [latest GitHub release](https://github.com/ukiews/companion-module-westocean-ws604s/releases/latest).
2. In Companion 5 or later, open **Modules → Import module package** and select the downloaded file.
3. In **Connections**, add **West Ocean WS-604S**. Enter the clock's LAN IP address or hostname and save.
4. Drag a timer button from **Presets**, or add **Start countdown** to a button or trigger and set the duration.

Companion must be able to reach the clock on TCP port 81. The clock's browser PIN applies to the web setup page. The Remote Console WebSocket on the tested firmware accepts commands without a PIN.

## Controls

| Action | Behavior |
| --- | --- |
| Start countdown | Enter whole seconds, `M:SS`, or `H:MM:SS`. For example, `30`, `5:00`, or `1:30:00`. |
| Start saved countdown preset | Start M1 (seconds), M2 (minutes), or M3 (hours) using the clock's stored settings. |
| Start stopwatch (M4) | Start the clock's count-up timer from zero. |
| Pause / resume timer | Toggle the active timer with the clock's Play/Pause key. |
| Cancel timer and show time | Exit the timer and return to the time display. |

Start actions replace the current timer. Custom countdowns from 1 second through 99:59 use M2 with one-second resolution. Longer durations through 99 hours 59 minutes use M3 and require whole minutes. Custom durations are entered with remote keystrokes and leave saved presets intact. The clock controls its own sound and repeat behavior.

The `display` variable mirrors the characters reported by the clock, including its own formatting as a countdown drops below one minute. Drag **Mirror clock display** to use that value as button text. The clock reports display text rather than timer mode or play/pause state.

Hardware validation covers a WS-604S running firmware V2.0.1 (Aug 22, 2025). Firmware with a different Remote Console protocol may require a module update.

## Development

Use Node 22 and pnpm. Run `pnpm install --frozen-lockfile`, `pnpm test`, and `pnpm package`. The package command writes an importable `.tgz` in the repository root.
