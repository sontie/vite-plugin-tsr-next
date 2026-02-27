import type { Logger } from './types'

const bold = (s: string) => `\x1b[1m${s}\x1b[22m`
const red = (s: string) => `\x1b[31m${s}\x1b[39m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[39m`
const green = (s: string) => `\x1b[32m${s}\x1b[39m`
const gray = (s: string) => `\x1b[90m${s}\x1b[39m`

export function createLogger(debug: boolean): Logger {
  const prefix = bold('[vite-plugin-tsr-next]')
  return {
    info: (msg: string) => console.log(`${prefix} ${green(msg)}`),
    warn: (msg: string) => console.warn(`${prefix} ${yellow(msg)}`),
    error: (msg: string) => console.error(`${prefix} ${red(msg)}`),
    debug: (msg: string) => { if (debug) console.log(`${prefix} ${gray(msg)}`) },
  }
}
