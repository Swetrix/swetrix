import fs from 'fs'
import path from 'path'

const locales = JSON.parse(fs.readFileSync('public/locales/en.json', 'utf8'))
const allKeys = []
function flatten(obj, prefix = '') {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      flatten(obj[key], fullKey)
    } else {
      allKeys.push(fullKey)
    }
  }
}
flatten(locales)

const dynamicPrefixes = [
  'dashboard.',
  'common.',
  'profileSettings.',
  'apiNotifications.',
  'experiments.status.',
  'alert.metrics.',
  'alert.conditions.',
  'project.',
  'project.mapping.',
  'project.contains.',
  'organisations.role.',
  'auth.signup.features.',
  'footer.',
  'project.settings.roles.',
  'main.faq.items.',
  'main.web.features.',
  'main.sessions.features.',
  'performance.fast.list.',
  'errors.fast.list.',
  'startups.whyUs.',
  'smbs.whyUs.',
  'marketers.whyUs.',
  'experiments.multipleVariantOptions.',
  'experiments.featureFlagMode.',
  'experiments.exposureTrigger.',
  'experiments.status.',
  'project.settings.tabs.',
  'project.settings.difficultyLevels.',
]

function getFiles(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach((file) => {
    file = path.join(dir, file)
    const stat = fs.statSync(file)
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file))
    } else {
      if (file.match(/\.(ts|tsx|json|html)$/) && !file.endsWith('en.json') && !file.includes('node_modules')) {
        results.push(file)
      }
    }
  })
  return results
}

const files = getFiles('app')
const fileContents = files.map((f) => fs.readFileSync(f, 'utf8'))

const unusedKeys = allKeys.filter((key) => {
  if (dynamicPrefixes.some((p) => key.startsWith(p))) {
    return false
  }

  const isUsed = fileContents.some((content) => content.includes(key))
  if (isUsed) {
    return false
  }

  return true
})

fs.writeFileSync('unused_keys.txt', unusedKeys.join('\n'))
console.log(`Stored ${unusedKeys.length} unused keys in unused_keys.txt`)
