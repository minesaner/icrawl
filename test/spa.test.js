const path = require('path')
const fs = require('fs')
const childProcess = require('child_process')
const Crawl = require('../index')

describe('spa', () => {
  const siteName = 'spa-index_stats'
  const outputPath = path.resolve(process.cwd(), 'test/__static__/' + siteName)
  const config = {
    routes: ['/', '/stats'],
    serverConfig: {
      path: path.resolve(process.cwd(), 'test/site/' + siteName),
      isFallback: true,
      port: 3334,
    },
    outputPath: outputPath,
    showProcess: false,
  }

  beforeEach(() => {
    childProcess.execSync(`rm -rf ${outputPath}`)
  })

  it('should save / and stats', done => {
    new Crawl(config).start().then(() => {
      expect(fs.existsSync(path.resolve(outputPath, '_.html'))).toBeTruthy()
      expect(fs.existsSync(path.resolve(outputPath, 'stats_.html'))).toBeTruthy()
      done()
    })
  })
})
