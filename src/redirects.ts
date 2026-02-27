import * as fs from 'fs'
import type { RedirectRule, Logger } from './types'

/**
 * Load redirects from _redirects.ts file
 */
export function loadRedirects(redirectsFile: string, logger: Logger): RedirectRule[] {
  if (!fs.existsSync(redirectsFile)) {
    return []
  }

  try {
    const content = fs.readFileSync(redirectsFile, 'utf-8')

    // Strip TypeScript syntax to get a plain JS expression
    const cleaned = content
      .replace(/\/\*[\s\S]*?\*\//g, '')              // Block comments
      .replace(/\/\/.*/g, '')                         // Line comments
      .replace(/import\s+.*?[\n;]/g, '')              // Import statements
      .replace(/export\s+default\s+/, '')             // export default
      .replace(/\bas\s+const\b/g, '')                 // as const
      .replace(/\bsatisfies\s+[\w<>\[\],\s|]+/g, '') // satisfies Type

    const trimmed = cleaned.trim()
    if (!trimmed) {
      logger.warn(`Redirects file is empty: ${redirectsFile}`)
      return []
    }

    // Evaluate the cleaned expression using Function constructor
    // Safe: this runs at build time on developer's own project code
    const redirects = new Function(`return ${trimmed}`)()

    if (!Array.isArray(redirects)) {
      logger.warn(`${redirectsFile} should export an array, got ${typeof redirects}`)
      return []
    }

    logger.debug(`Loaded ${redirects.length} redirect rules from ${redirectsFile}`)
    return redirects
  } catch (error) {
    logger.error(`Failed to parse redirects file: ${redirectsFile}`)
    logger.error(`  ${error instanceof Error ? error.message : String(error)}`)
    logger.warn(`  Ensure the file exports a simple array of { from, to, permanent? } objects`)
    return []
  }
}
