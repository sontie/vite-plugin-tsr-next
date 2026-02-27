import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { loadRedirects } from '../src/redirects'
import type { Logger } from '../src/types'

const warnings: string[] = []
const errors: string[] = []

const testLogger: Logger = {
  info: () => {},
  warn: (msg: string) => warnings.push(msg),
  error: (msg: string) => errors.push(msg),
  debug: () => {},
}

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsr-redirect-'))
  warnings.length = 0
  errors.length = 0
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeRedirectsFile(content: string): string {
  const filePath = path.join(tmpDir, '_redirects.ts')
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

describe('loadRedirects', () => {
  it('should return empty array when file does not exist', () => {
    const result = loadRedirects('/nonexistent/_redirects.ts', testLogger)
    expect(result).toEqual([])
  })

  it('should parse a simple redirect array', () => {
    const file = writeRedirectsFile(`
export default [
  { from: '/old', to: '/new', permanent: true },
  { from: '/blog', to: '/posts' },
]
`)
    const result = loadRedirects(file, testLogger)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ from: '/old', to: '/new', permanent: true })
    expect(result[1]).toEqual({ from: '/blog', to: '/posts' })
  })

  it('should handle as const syntax', () => {
    const file = writeRedirectsFile(`
export default [
  { from: '/old', to: '/new' },
] as const
`)
    const result = loadRedirects(file, testLogger)
    expect(result).toHaveLength(1)
  })

  it('should handle satisfies syntax', () => {
    const file = writeRedirectsFile(`
export default [
  { from: '/old', to: '/new' },
] satisfies RedirectRule[]
`)
    const result = loadRedirects(file, testLogger)
    expect(result).toHaveLength(1)
  })

  it('should handle single quotes', () => {
    const file = writeRedirectsFile(`
export default [
  { from: '/old', to: '/new' },
]
`)
    const result = loadRedirects(file, testLogger)
    expect(result).toHaveLength(1)
  })

  it('should handle trailing commas', () => {
    const file = writeRedirectsFile(`
export default [
  { from: '/old', to: '/new', },
]
`)
    const result = loadRedirects(file, testLogger)
    expect(result).toHaveLength(1)
  })

  it('should handle comments', () => {
    const file = writeRedirectsFile(`
// This is a comment
/* Block comment */
export default [
  // Redirect old page
  { from: '/old', to: '/new' },
]
`)
    const result = loadRedirects(file, testLogger)
    expect(result).toHaveLength(1)
  })

  it('should warn when export is not an array', () => {
    const file = writeRedirectsFile(`
export default { from: '/old', to: '/new' }
`)
    const result = loadRedirects(file, testLogger)
    expect(result).toEqual([])
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('should return empty array and log error on parse failure', () => {
    const file = writeRedirectsFile(`
export default this is not valid
`)
    const result = loadRedirects(file, testLogger)
    expect(result).toEqual([])
    expect(errors.length).toBeGreaterThan(0)
  })

  it('should handle empty file', () => {
    const file = writeRedirectsFile('')
    const result = loadRedirects(file, testLogger)
    expect(result).toEqual([])
  })

  it('should strip import statements', () => {
    const file = writeRedirectsFile(`
import type { RedirectRule } from './types'

export default [
  { from: '/old', to: '/new' },
]
`)
    const result = loadRedirects(file, testLogger)
    expect(result).toHaveLength(1)
  })
})
