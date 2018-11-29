const fs = require('fs')
const path = require('path')
const Crawl = require('./index')

fs.writeFileSync('urls1.txt', '')
const crawl = new Crawl({
  saveHTML: false,
  // requestTimeout: 3000,
  routes: [
    'https://nodejs.org/api/path.html',
  ],
  outputPath: path.resolve(__dirname, 'static'),
  depth: {
    value: 2,
    after: routes => {
      fs.appendFileSync(
        'urls1.txt',
        '\n' + routes.map(r => `url: ${r.url}\nreferer: ${r.referer}\nroot: ${r.root}\ndepth: ${r.depth()}`).join('\n\n')
      )
    }
    // exclude: '',
    // include: '',
  }
})
crawl.start()
