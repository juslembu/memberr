// Sync the latest git tag into apps/mobile/app.json (expo.version + name).
// Run automatically before `deploy:web` so the web build matches the current tag.
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const appJsonPath = 'apps/mobile/app.json'
const cfg = JSON.parse(readFileSync(appJsonPath, 'utf8'))

let tag
try {
  tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim()
} catch {
  console.error('ERROR: No reachable git tag found. `deploy:web` requires a tag to set the web app version.')
  console.error('Run `git fetch --tags` and ensure the current checkout has a tag, or tag the release first.')
  process.exit(1)
}

const version = tag.startsWith('v') ? tag.slice(1) : tag
const isBeta = tag.includes('-beta')

cfg.expo.version = version
if (isBeta) {
  cfg.expo.name = 'Memberr Beta'
} else {
  cfg.expo.name = 'Memberr'
}

writeFileSync(appJsonPath, JSON.stringify(cfg, null, 2) + '\n')
console.log(`Synced version from tag ${tag} → version: ${version}, name: ${cfg.expo.name}`)