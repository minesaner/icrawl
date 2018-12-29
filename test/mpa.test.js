const path = require('path')
const fs = require('fs')
const childProcess = require('child_process')
const Crawl = require('../index')

describe('mpa', () => {
  const siteName = 'mpa-a_b_c_d'
  const outputPath = path.resolve(process.cwd(), 'test/__static__/' + siteName)
  const config = {
    routes: ['/a.html'],
    isNormalizeSourceURL: true,
    serverConfig: {
      path: path.resolve(process.cwd(), 'test/site/' + siteName),
      public: 'http://www.www.com',
    },
    outputPath: outputPath,
    showProcess: false,
  }

  beforeEach(() => {
    childProcess.execSync(`rm -rf ${outputPath}`)
  })

  it('should only save a.html', done => {
    new Crawl(config).start().then(() => {
      expect(fs.existsSync(path.resolve(outputPath, 'a.html_.html'))).toBeTruthy()
      expect(fs.existsSync(path.resolve(outputPath, 'b.html_.html'))).toBeFalsy()
      expect(fs.existsSync(path.resolve(outputPath, 'c.html_.html'))).toBeFalsy()
      expect(fs.existsSync(path.resolve(outputPath, 'd.html_.html'))).toBeFalsy()
      done()
    })
  })
  
  it('should save a.html, b.html, c.html, and not d.html', done => {
    new Crawl({...config, depth: 2}).start().then(() => {
      expect(fs.existsSync(path.resolve(outputPath, 'a.html_.html'))).toBeTruthy()
      expect(fs.existsSync(path.resolve(outputPath, 'b.html_.html'))).toBeTruthy()
      expect(fs.existsSync(path.resolve(outputPath, 'c.html_.html'))).toBeTruthy()
      expect(fs.existsSync(path.resolve(outputPath, 'd.html_.html'))).toBeFalsy()
      done()
    })
  })

  it('should contains http://www.www.com in href', done => {
    new Crawl(config).start().then(() => {
      setTimeout(() => {
        const html = fs.readFileSync(path.resolve(outputPath, 'a.html_.html'), 'utf8')
        expect(html.indexOf('http://www.www.com') !== -1).toBeTruthy()
        done()
      }, 500)
    })
  })
})
