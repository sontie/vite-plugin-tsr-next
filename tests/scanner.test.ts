import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { scanDirectory } from '../src/scanner'
import type { Logger } from '../src/types'

const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}

const extensions = ['.tsx', '.ts', '.jsx', '.js']

let tmpDir: string

function createFile(relativePath: string, content: string = 'export default function() { return null }') {
  const fullPath = path.join(tmpDir, relativePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, content, 'utf-8')
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsr-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('scanDirectory', () => {
  it('should find a single page.tsx', () => {
    createFile('page.tsx')
    const { pages } = scanDirectory(tmpDir, extensions, 'src/pages', [], silentLogger)
    expect(pages).toHaveLength(1)
    expect(pages[0].path).toBe('/')
    expect(pages[0].isLayout).toBe(false)
  })

  it('should find nested pages', () => {
    createFile('page.tsx')
    createFile('about/page.tsx')
    createFile('users/page.tsx')
    const { pages } = scanDirectory(tmpDir, extensions, 'src/pages', [], silentLogger)
    expect(pages).toHaveLength(3)
    const paths = pages.map(p => p.path).sort()
    expect(paths).toEqual(['/', '/about', '/users'])
  })

  it('should find dynamic route [id]', () => {
    createFile('users/[id]/page.tsx')
    const { pages } = scanDirectory(tmpDir, extensions, 'src/pages', [], silentLogger)
    expect(pages).toHaveLength(1)
    expect(pages[0].path).toBe('/users/$id')
  })

  it('should find layout.tsx', () => {
    createFile('layout.tsx')
    const { layouts } = scanDirectory(tmpDir, extensions, 'src/pages', [], silentLogger)
    expect(layouts).toHaveLength(1)
    expect(layouts[0].isLayout).toBe(true)
    expect(layouts[0].path).toBe('/')
  })

  it('should find global 404.tsx', () => {
    createFile('404.tsx')
    const { pages } = scanDirectory(tmpDir, extensions, 'src/pages', [], silentLogger)
    expect(pages).toHaveLength(1)
    expect(pages[0].is404).toBe(true)
    expect(pages[0].isGlobal404).toBe(true)
    expect(pages[0].id).toBe('NotFoundRoute')
  })

  it('should find local 404.tsx', () => {
    createFile('users/404.tsx')
    const { notFounds } = scanDirectory(tmpDir, extensions, 'src/pages', [], silentLogger)
    expect(notFounds.size).toBe(1)
    // users/404.tsx -> relativePath = 'users' -> filePathToRoutePath('users') = '/users'
    expect(notFounds.has('/users')).toBe(true)
  })

  it('should skip ignored directories', () => {
    createFile('page.tsx')
    createFile('__tests__/page.tsx')
    createFile('__mocks__/page.tsx')
    const { pages } = scanDirectory(tmpDir, extensions, 'src/pages', ['__tests__', '__mocks__'], silentLogger)
    expect(pages).toHaveLength(1)
    expect(pages[0].path).toBe('/')
  })

  it('should skip hidden directories', () => {
    createFile('page.tsx')
    createFile('.hidden/page.tsx')
    const { pages } = scanDirectory(tmpDir, extensions, 'src/pages', [], silentLogger)
    expect(pages).toHaveLength(1)
  })

  it('should handle non-existent directory gracefully', () => {
    const { pages, layouts } = scanDirectory('/nonexistent/path', extensions, 'src/pages', [], silentLogger)
    expect(pages).toHaveLength(0)
    expect(layouts).toHaveLength(0)
  })

  it('should handle route groups', () => {
    createFile('(auth)/login/page.tsx')
    const { pages } = scanDirectory(tmpDir, extensions, 'src/pages', [], silentLogger)
    expect(pages).toHaveLength(1)
    expect(pages[0].path).toBe('/login')
  })
})
