const fs = require('fs')
const path = require('path')
const Crawl = require('./index')

fs.writeFileSync('urls.txt', '')
const crawl = new Crawl({
  saveHTML: false,
  isNormalizeSourceURL: true,
  routes: [
    'https://nodejs.org/api/path.html',
    'https://nodejs.org/api/buffer.html',
  ],
  outputPath: path.resolve(__dirname, 'static'),
  depth: {
    value: 1,
    after: routes => {
      fs.appendFileSync(
        'urls.txt',
        '\n' + routes.map(r => `url: ${r.url}\nreferer: ${r.referer}\nroot: ${r.root}\ndepth: ${r.depth()}`).join('\n\n')
      )
    }
  }
})
crawl.start()
