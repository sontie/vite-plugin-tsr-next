import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import tanstackRouterPlugin from '../src/plugin'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsr-plugin-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function createFile(relativePath: string, content: string = 'export default function() { return null }') {
  const fullPath = path.join(tmpDir, relativePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, content, 'utf-8')
}

describe('tanstackRouterPlugin', () => {
  it('should return a valid Vite plugin object', () => {
    const plugin = tanstackRouterPlugin()
    expect(plugin).toHaveProperty('name', 'vite-plugin-tsr-next')
    expect(plugin).toHaveProperty('configResolved')
    expect(plugin).toHaveProperty('buildStart')
    expect(plugin).toHaveProperty('configureServer')
  })

  it('should generate route files on buildStart', () => {
    // Create pages directory with a page
    createFile('src/pages/page.tsx')

    const plugin = tanstackRouterPlugin({
      pagesDir: 'src/pages',
      outputFile: 'src/routeTree.gen.tsx',
      typeOutputFile: 'src/routeTree.gen.d.ts',
    })

    // Simulate Vite lifecycle
    const configResolved = plugin.configResolved as (config: { root: string }) => void
    configResolved({ root: tmpDir })

    const buildStart = plugin.buildStart as () => void
    buildStart()

    // Check output files exist
    const outputPath = path.join(tmpDir, 'src/routeTree.gen.tsx')
    const typeOutputPath = path.join(tmpDir, 'src/routeTree.gen.d.ts')

    expect(fs.existsSync(outputPath)).toBe(true)
    expect(fs.existsSync(typeOutputPath)).toBe(true)

    // Check generated content
    const content = fs.readFileSync(outputPath, 'utf-8')
    expect(content).toContain('createRootRoute')
    expect(content).toContain("path: '/'")
    expect(content).toContain('pickExports')
    expect(content).toContain('export const routeTree')
  })

  it('should handle missing pages directory gracefully', () => {
    const plugin = tanstackRouterPlugin({
      pagesDir: 'src/pages',
    })

    const configResolved = plugin.configResolved as (config: { root: string }) => void
    configResolved({ root: tmpDir })

    // Should not throw
    const buildStart = plugin.buildStart as () => void
    expect(() => buildStart()).not.toThrow()
  })

  it('should respect ignorePatterns option', () => {
    createFile('src/pages/page.tsx')
    createFile('src/pages/__tests__/page.tsx')

    const plugin = tanstackRouterPlugin({
      pagesDir: 'src/pages',
      outputFile: 'src/routeTree.gen.tsx',
      typeOutputFile: 'src/routeTree.gen.d.ts',
      ignorePatterns: ['__tests__'],
    })

    const configResolved = plugin.configResolved as (config: { root: string }) => void
    configResolved({ root: tmpDir })

    const buildStart = plugin.buildStart as () => void
    buildStart()

    const content = fs.readFileSync(path.join(tmpDir, 'src/routeTree.gen.tsx'), 'utf-8')
    // Should only have the root page, not __tests__/page
    const pageImports = content.match(/import \* as/g) || []
    // Outlet + 1 page = 2 imports (or redirect import etc.)
    expect(pageImports.length).toBeLessThanOrEqual(2)
  })

  it('should generate routes with redirects', () => {
    createFile('src/pages/page.tsx')
    createFile('src/_redirects.ts', `export default [\n  { from: '/old', to: '/new', permanent: true },\n]`)

    const plugin = tanstackRouterPlugin({
      pagesDir: 'src/pages',
      outputFile: 'src/routeTree.gen.tsx',
      typeOutputFile: 'src/routeTree.gen.d.ts',
      redirectsFile: 'src/_redirects.ts',
    })

    const configResolved = plugin.configResolved as (config: { root: string }) => void
    configResolved({ root: tmpDir })

    const buildStart = plugin.buildStart as () => void
    buildStart()

    const content = fs.readFileSync(path.join(tmpDir, 'src/routeTree.gen.tsx'), 'utf-8')
    expect(content).toContain('redirect')
    expect(content).toContain("to: '/new'")
  })
})
