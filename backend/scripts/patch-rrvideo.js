const fs = require('fs')
const path = require('path')

const packagePath = require.resolve('rrvideo/package.json')
const packageDir = path.dirname(packagePath)
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

if (packageJson.version !== '2.0.1') {
  throw new Error(`Unsupported rrvideo version: ${packageJson.version}`)
}

const filePath = path.join(packageDir, 'build', 'index.js')
let source = fs.readFileSync(filePath, 'utf8')

const playerBundle =
  "require.resolve('rrweb-player'), '../../dist/rrweb-player.umd.cjs'"
const rrwebBundle = "require.resolve('rrweb'), '../../dist/rrweb.umd.cjs'"

if (source.includes(playerBundle)) {
  source = source.replace(playerBundle, rrwebBundle)
} else if (!source.includes(rrwebBundle)) {
  throw new Error('Could not find rrvideo player bundle path')
}

const defaultResolutionRatio = '    resolutionRatio: 0.8,'
const oneToOneResolutionRatio = '    resolutionRatio: 0.4,'

if (source.includes(defaultResolutionRatio)) {
  source = source.replace(defaultResolutionRatio, oneToOneResolutionRatio)
} else if (!source.includes(oneToOneResolutionRatio)) {
  throw new Error('Could not find rrvideo resolution ratio')
}

const defaultPageStyle =
  '  <style>html, body {padding: 0; border: none; margin: 0;}</style>'
const exportPageStyle = [
  '  <style>',
  '    html, body {',
  '      width: 100%;',
  '      height: 100%;',
  '      padding: 0;',
  '      border: none;',
  '      margin: 0;',
  '      overflow: hidden;',
  '      background: #fff;',
  '    }',
  '    .replayer-wrapper {',
  '      position: relative;',
  '      overflow: hidden;',
  '      background: #fff;',
  '      transform: none !important;',
  '      transform-origin: top left;',
  '    }',
  '    .replayer-wrapper iframe {',
  '      border: 0;',
  '    }',
  '  </style>',
].join('\n')

if (source.includes(defaultPageStyle)) {
  source = source.replace(defaultPageStyle, exportPageStyle)
} else if (!source.includes(exportPageStyle)) {
  throw new Error('Could not find rrvideo HTML page style')
}

const blockStart = source.indexOf(
  '      const userConfig = ${JSON.stringify((config === null',
)
const blockEndMarker = [
  '      } catch (error) {',
  "        console.error('Error initializing replayer:', error);",
  '        window.onReplayFinish();',
  '      }',
].join('\n')
const blockEnd = source.indexOf(blockEndMarker, blockStart)

if (blockStart === -1 || blockEnd === -1) {
  throw new Error('Could not find rrvideo HTML player block')
}

const blockReplacement = [
  '      const userConfig = ${JSON.stringify((config === null || config === void 0 ? void 0 : config.rrwebPlayer) || {})};',
  '      try {',
  '        const insertStyleRules = Array.isArray(userConfig.insertStyleRules) ? userConfig.insertStyleRules : [];',
  '        window.replayer = new rrweb.Replayer(events, {',
  '          ...userConfig,',
  '          root: document.body,',
  '          insertStyleRules: [...insertStyleRules, \'html, body { background-color: #fff; }\'],',
  '        });',
  '        const resizeWrapper = () => {',
  "          const wrapper = document.querySelector('.replayer-wrapper');",
  '          if (!wrapper) return;',
  "          wrapper.style.width = String(userConfig.width || window.innerWidth) + 'px';",
  "          wrapper.style.height = String(userConfig.height || window.innerHeight) + 'px';",
  '        };',
  '        resizeWrapper();',
  "        window.replayer.on('finish', () => window.onReplayFinish());",
  "        window.replayer.on('resize', resizeWrapper);",
  '        setTimeout(() => window.replayer.play(), 0);',
  '      } catch (error) {',
  "        console.error('Error initializing replayer:', error);",
  '        window.onReplayFinish();',
  '      }',
].join('\n')

const patched =
  source.slice(0, blockStart) +
  blockReplacement +
  source.slice(blockEnd + blockEndMarker.length)

if (patched === fs.readFileSync(filePath, 'utf8')) {
  console.log('rrvideo patch already applied')
} else {
  fs.writeFileSync(filePath, patched)
  console.log('Patched rrvideo to render with rrweb Replayer')
}
