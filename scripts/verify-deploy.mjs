/**
 * Pre-deploy checks: env, Vite build, bundle embeds Supabase, Pages index paths.
 * Run: node scripts/verify-deploy.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'

const PROJECT_REF = 'nyrtsmzxdtyboxeqdluk'
let failed = 0

function fail(msg) {
  console.error(`FAIL: ${msg}`)
  failed++
}

function ok(msg) {
  console.log(`OK: ${msg}`)
}

// 1) .env.production
const prodEnvPath = '.env.production'
if (!existsSync(prodEnvPath)) {
  fail('Missing .env.production')
} else {
  const prod = readFileSync(prodEnvPath, 'utf8')
  if (!prod.includes(`VITE_SUPABASE_URL=https://${PROJECT_REF}.supabase.co`)) {
    fail('.env.production missing correct VITE_SUPABASE_URL')
  } else if (!/VITE_SUPABASE_(PUBLISHABLE_KEY|ANON_KEY)=.+/.test(prod)) {
    fail('.env.production missing Supabase key')
  } else {
    ok('.env.production has Supabase URL + key')
  }
}

// 2) Build
console.log('\nBuilding…')
try {
  execSync('npm run build', { stdio: 'inherit' })
  ok('npm run build succeeded')
} catch {
  fail('npm run build failed')
  process.exit(1)
}

// 3) dist bundle contains project ref
const assetsDir = join('dist', 'assets')
const jsFiles = readdirSync(assetsDir).filter((f) => f.startsWith('index-') && f.endsWith('.js'))
if (jsFiles.length === 0) {
  fail('No dist/assets/index-*.js found')
} else {
  const mainJs = join(assetsDir, jsFiles.sort().at(-1))
  const bundle = readFileSync(mainJs, 'utf8')
  if (!bundle.includes(PROJECT_REF)) {
    fail(`Bundle ${mainJs} does not embed Supabase project ref (empty env at build?)`)
  } else if (bundle.includes('Supabase is not configured') && !bundle.includes(PROJECT_REF)) {
    fail('Bundle looks unconfigured')
  } else {
    ok(`Bundle ${jsFiles.at(-1)} embeds Supabase (${PROJECT_REF})`)
  }
}

// 4) dist/index.html uses /gymbro/ base
const distHtml = readFileSync('dist/index.html', 'utf8')
if (!distHtml.includes('/gymbro/assets/')) {
  fail('dist/index.html missing /gymbro/assets/ paths')
} else {
  ok('dist/index.html uses GitHub Pages base /gymbro/')
}

// 5) Root index.html matches dist (if present)
if (existsSync('index.html')) {
  const rootHtml = readFileSync('index.html', 'utf8')
  const distScript = distHtml.match(/src="([^"]+\.js)"/)?.[1]
  const rootScript = rootHtml.match(/src="([^"]+\.js)"/)?.[1]
  if (distScript && rootScript && distScript !== rootScript) {
    console.warn(
      `WARN: root index.html script (${rootScript}) differs from dist (${distScript}) — run publish step before push`,
    )
  } else if (distScript && rootScript && distScript === rootScript) {
    ok('root index.html matches dist entry script')
  }
}

console.log(failed === 0 ? '\nAll deploy checks passed.' : `\n${failed} check(s) failed.`)
process.exit(failed === 0 ? 0 : 1)
