const puppeteer = require('puppeteer')
const ora = require('ora')
const logSymbols = require('log-symbols')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const url = require('url')
const crypto = require('crypto')
const mkdirsSync = require('./lib/mkdirsSync')
const Progress = require('./lib/progress')
const disarr = require('./lib/disarr')
const PageRoute = require('./lib/pageRoute')
const PAGE_EXT = ['', '.html', '.htm', '.shtml', '.jsp', '.php', '.asp', '.aspx']

function Crawl({
  viewport = {width: 1200, height: 600},
  maxPageCount = 10,
  requestTimeout = 30000,
  routes = [],
  pageExt = [],
  depth = 0,
  host = '',
  saveHTML = true,
  outputPath = process.cwd() + '/static',
}) {
  this.pageExt = new Set([...PAGE_EXT, ...pageExt])
  this.totalCount = routes.length // 需要爬取的页面总数
  this.routes = routes.map(r => new PageRoute(host + r))
  this.runningURL = new Set()
  this.completeURL = new Set()
  this.viewport = viewport
  this.requestTimeout = requestTimeout
  this.maxPageCount = maxPageCount
  this.runningPageCount = Math.min(routes.length, maxPageCount)
  this.errors = []
  this.progress = new Progress()
  this.spinner = ora()
  this.completeCount = 0
  this.startTime = null
  this.browser = null
  this.depthIncludeRegexp = null
  this.depthExcludeRegexp = null
  this.afterDeep = null
  if (typeof depth === 'number') {
    this.depth = depth
  } else {
    this.depth = depth.value
    this.depthIncludeRegexp = depth.include
    this.depthExcludeRegexp = depth.exclude
    this.afterDeep = depth.after
  }
  this.saveHTML = saveHTML
  this.outputPath = outputPath
}

Crawl.prototype.start = function() {
  this.startTime = Date.now()
  this.spinner.start()
  this._progressText()
  puppeteer.launch({
    defaultViewport: this.viewport
  }).then(browser => {
    this.browser = browser
    this._newPage(this.runningPageCount)
  })
}

Crawl.prototype._newPage = function(pageCount) {
  const {browser, routes} = this
  for (let i = 0; i < pageCount; i++) {
    browser.newPage().then(page => {
      // todo
      page.on('request', request => {
        if (request.url().endsWith('nodejs/node')) {
          console.log(request.url())
          console.log('resource type: ' + request.resourceType())
        }
      })
      this._crawl(page, routes.shift())
    })
  }
}

Crawl.prototype._progressText = function() {
  const {completeCount, totalCount} = this
  this.progress.setPercent(completeCount / totalCount)
  this.spinner.text = `${this.progress.progressBar} ${this.completeCount}/${totalCount}`
}

Crawl.prototype._deepLink = function(page, root, current) {
  const {depth, depthExcludeRegexp: exclude, depthIncludeRegexp: include} = this
  
  if (depth <= 0) {
    return Promise.resolve([])
  }
  
  if (current.depth >= depth) {
    return Promise.resolve([])
  }

  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(l => l.href.replace(/(.*?)#.*/, '$1'))
  }).then(links => {
    links = disarr(
      links
        .filter(l => !l.startsWith('javascript:'))
        .filter(l => this.pageExt.has(path.extname(l)))
        .filter(l => !this.completeURL.has(l))
        .filter(l => !this.runningURL.has(l))
        .filter(l => this.routes.findIndex(r => r.url === l) === -1)
        .filter(l => l !== current.url)
    )

    if (include) {
      links = links.filter(l => include.test(l))
    }
    if (exclude) {
      links = links.filter(l => !exclude.test(l))
    }

    const refererURL = url.parse(current.url)
    links = links.map(l => {
      if (l.startsWith('//')) {
        return `${refererURL.protocol}${l}`
      }
      if (l.startsWith('/')) {
        return `${refererURL.protocol}//${refererURL.host}${l}`
      }
      if (/^(?:http:|https:)/.test(l)) {
        return l
      }

      return `${path.dirname(referer.url)}/${l}`
    })

    return links
  }).then(links => {
    const {routes, runningPageCount, maxPageCount} = this
    const linkCount = links.length
    if (linkCount) {
      const deepRoutes = links.map(l => new PageRoute(l, root, current))
      this.routes = routes.concat(deepRoutes)
      this.totalCount += linkCount

      if (runningPageCount < maxPageCount) {
        this._newPage(Math.min(maxPageCount - runningPageCount, this.totalCount - runningPageCount))
      }

      this.afterDeep && this.afterDeep(deepRoutes)
    }
    return links
  }).catch(() => {
    return []
  })
}

Crawl.prototype._saveHTML = function(page, pageRoute) {
  if (!this.saveHTML) {
    return Promise.resolve()
  }

  const {outputPath} = this
  const pageURL = url.parse(pageRoute.url)
  let search = ''

  if (pageURL.search) {
    search = pageURL.search.slice(1)
  }

  // 对查询参数进行 md5 处理
  // 保证写入的文件名称依据查询参数唯一
  if (search) {
    const searchMd5 = crypto.createHash('md5')
    searchMd5.update(search)
    search = searchMd5.digest('hex')
  }
  
  const filename = path.resolve(outputPath, `./${pageURL.pathname}${search}.html}`)

  return page.content().then(html => {
    mkdirsSync(path.dirname(filename))
    const writeStream = fs.createWriteStream(filename)
    writeStream.write(html, 'utf8')
    writeStream.end()
  })
}

Crawl.prototype._writeErrorFile = function() {
  // todo
  // const logname = `${new Date().toISOString().replace(/:|\./g, '-')}_icrawl-err.log`
  // console.log(this.errors[0])
  const logname = 'icrawl-err.log'
  const logpath = path.resolve(process.cwd(), logname)
  const errors = this.errors.map(e => `url: ${e.pageRoute.url}\n` +
    `referer: ${e.pageRoute.referer || '<null>'}\n` +
    `root: ${e.pageRoute.root || '<null>'}\n` +
    `err: ${e.error.name}<${e.error.message}>`
  )
  const writeStream = fs.createWriteStream(logpath)
  writeStream.write(errors.join('\n\n') + '\n')
  writeStream.end()
  console.log(`${chalk.red.bold('!! ')}A complete log of errors can be found in:`)
  console.log(chalk.red('!! ') + logpath)
}

Crawl.prototype._finishCallback = function(page, pageRoute) {
  const {routes, startTime, browser} = this
  this.completeCount += 1
  this.runningURL.delete(pageRoute.url)
  this.completeURL.add(pageRoute.url)
  this._progressText()

  if (this.completeCount === this.totalCount) {
    this.spinner.stopAndPersist({
      symbol: logSymbols.success
    })
    
    this.spinner.stopAndPersist({
      symbol: this.errors.length > 0 ? logSymbols.info : logSymbols.success,
      text: `${chalk.green(this.completeCount - this.errors.length)} successed, ` +
        `${chalk.red(this.errors.length)} failed, ` +
        `${chalk.yellow(Date.now() - startTime)} ms`
    })

    this.errors.length && this._writeErrorFile()
    browser.close()
    // todo
    const writeStream = fs.createWriteStream('urls.txt')
    writeStream.write(Array.from(this.completeURL).join('\n'), 'utf8')
    writeStream.end()
  } else {
    const nextRoute = routes.shift()
    if (nextRoute) {
      this._crawl(page, nextRoute)
    } else {
      page.close()
    }
  }
}

Crawl.prototype._crawl = function(page, pageRoute) {
  if (this.completeURL.has(pageRoute.url)) {
    return Promise.resolve({page, pageRoute})
  }
  
  this.runningURL.add(pageRoute.url)
  page.goto(
    pageRoute.url,
    {
      waitUntil: 'networkidle2',
      timeout: this.requestTimeout
    }
  ).then(() => {
    Promise.all([
      this._deepLink(page, pageRoute.root || pageRoute, pageRoute),
      this._saveHTML(page, pageRoute),
    ]).catch(error => {
      this.errors.push({pageRoute, error})
    }).finally(() => {
      this._finishCallback(page, pageRoute)
    })
  }).catch(error => {
    this.errors.push({pageRoute, error})
    this._finishCallback(page, pageRoute)
  })
}

module.exports = Crawl
