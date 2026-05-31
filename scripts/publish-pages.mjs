/**
 * Copy dist → repo root + docs/ (same as deploy-pages.yml publish step).
 * Run after: npm run build && node scripts/verify-deploy.mjs
 */
import { cpSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'fs'

if (!existsSync('dist/index.html')) {
  console.error('Run npm run build first.')
  process.exit(1)
}

for (const dir of ['docs', 'assets', 'quotes']) {
  rmSync(dir, { recursive: true, force: true })
}
mkdirSync('docs', { recursive: true })
cpSync('dist', 'docs', { recursive: true })
writeFileSync('docs/.nojekyll', '')
cpSync('dist/index.html', 'index.html')
cpSync('dist/index.html', 'docs/index.html')
cpSync('dist/assets', 'assets', { recursive: true })
if (existsSync('dist/quotes')) {
  cpSync('dist/quotes', 'quotes', { recursive: true })
}
writeFileSync('.nojekyll', '')
console.log('Published dist → index.html, assets/, quotes/, docs/')
