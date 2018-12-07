const puppeteer = require('puppeteer')
const ora = require('ora')
const logSymbols = require('log-symbols')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const os = require('os')
const http = require('http')
const handler = require('serve-handler')
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
  isNormalizeSourceURL = false,
  serverConfig = null,
  requestInterception = null,
  progressBarStyle = {
    prefix: '',
    suffix: '',
    remaining: '░',
    completed: '█',
  },
}) {
  this.pageExt = new Set([...PAGE_EXT, ...pageExt])
  this.totalCount = routes.length // 需要爬取的页面总数

  if (serverConfig) {
    if (typeof serverConfig === 'string') {
      serverConfig = {
        path: serverConfig,
      }
    }

    serverConfig.port = serverConfig.port || 3333
    host = `http://127.0.0.1:${serverConfig.port}`
  }

  this.serverConfig = serverConfig
  this.server = null
  this.routes = routes.map(r => {
    if (/^(http:\/\/|https:\/\/)/.test(r)) {
      return new PageRoute(r)
    }
    return new PageRoute(host + r)
  })
  this.runningURL = new Set()
  this.completeURL = new Set()
  this.viewport = viewport
  this.requestTimeout = requestTimeout
  this.maxPageCount = maxPageCount
  this.runningPageCount = Math.min(routes.length, maxPageCount)
  this.errors = []
  this.pageTrash = []
  this.progress = new Progress(progressBarStyle)
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

  if (isNormalizeSourceURL === true) {
    this.isNormalizeSourceURL = {
      links: isNormalizeSourceURL,
      images: isNormalizeSourceURL,
      scripts: isNormalizeSourceURL,
      anchors: isNormalizeSourceURL,
    }
  } else {
    this.isNormalizeSourceURL = isNormalizeSourceURL
  }

  this.requestInterception = requestInterception
}

Crawl.prototype.start = function() {
  this._createServer().then(() => {
    this.startTime = Date.now()
    this.spinner.start()
    this._progressText()
    puppeteer.launch({
      defaultViewport: this.viewport
    }).then(browser => {
      this.browser = browser
      this._newPage(this.runningPageCount)
    })
  }).catch(err => {
    throw err
  })
}

Crawl.prototype._newPage = function(pageCount) {
  const {browser, routes} = this
  for (let i = 0; i < pageCount; i++) {
    browser.newPage().then(page => {
      const route = routes.shift()
      if (route) {
        this._setInterception(page).then(() => {
          this._crawl(page, route)
        }).catch(err => {
          throw err
        })
      }
    })
  }
}

Crawl.prototype._createServer = function() {
  if (this.serverConfig) {
    const serverConfig = {
      public: this.serverConfig.path,
    }

    if (this.serverConfig.isFallback) {
      serverConfig.rewrites = [
        {source: '*', destination: '/index.html'}
      ]
    }
    
    return new Promise(resolve => {
      const server = http.createServer((req, res) => {
        return handler(req, res, serverConfig)
      })

      server.listen(this.serverConfig.port, err => {
        if (err) throw err
        this.server = server
        resolve()
      })
    })
  }

  return Promise.resolve()
}

Crawl.prototype._setInterception = function(page) {
  const {requestInterception} = this
  if (requestInterception) {
    page.on('request', request => {
      const url = request.url()
      let ifContinue = true
      
      if (requestInterception.include) {
        if (requestInterception.include.test(url)) {
          ifContinue = true
        } else {
          ifContinue = false
        }
      }

      if (requestInterception.exclude && requestInterception.exclude.test(url)) {
        ifContinue = false
      }

      if (ifContinue) {
        request.continue()
      } else {
        request.abort()
      }
    })
    return page.setRequestInterception(true)
  }

  return Promise.resolve()
}

Crawl.prototype._progressText = function() {
  const {completeCount, totalCount} = this
  this.progress.setPercent(Math.min(completeCount / totalCount, 1))
  this.spinner.text = `${this.progress.progressBar} ${this.completeCount}/${totalCount}`
}

Crawl.prototype._deepLink = function(page, root, current) {
  const {depth, depthExcludeRegexp: exclude, depthIncludeRegexp: include} = this
  
  if (depth <= 0) {
    return Promise.resolve([])
  }
  
  if (current.depth() >= depth) {
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

    return links
  }).then(links => {
    const {routes, runningPageCount, maxPageCount} = this
    const linkCount = links.length
    if (linkCount) {
      const deepRoutes = links.map(l => new PageRoute(l, root, current))
      this.routes = routes.concat(deepRoutes)
      this.totalCount += linkCount

      if (runningPageCount < maxPageCount) {
        const newPageCount = Math.min(maxPageCount - runningPageCount, this.routes.length)
        this._newPage(newPageCount)
        this.runningPageCount += newPageCount
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

  let eva = Promise.resolve()

  if (this.serverConfig && !this.serverConfig.public) {
  } else if (this.isNormalizeSourceURL) {
    let baseURL = pageRoute.url

    if (this.serverConfig) {
      baseURL = this.serverConfig.public
    }
    
    eva = page.evaluate((base, isNormalizeSourceURL) => {
      if (isNormalizeSourceURL.links) {
        const links = Array.from(document.querySelectorAll('link[href]'))
        links.forEach(l => {
          l.href = new URL(l.getAttribute('href'), base).href
        })
      }

      if (isNormalizeSourceURL.anchors) {
        const anchors = Array.from(document.querySelectorAll('a[href]'))
        anchors.forEach(a => {
          a.href = new URL(a.getAttribute('href'), base).href
        })
      }

      if (isNormalizeSourceURL.scripts) {
        const scripts = Array.from(document.querySelectorAll('script[src]'))
        scripts.forEach(s => {
          s.src = new URL(s.getAttribute('src'), base).href
        })
      }

      if (isNormalizeSourceURL.images) {
        const imgs = Array.from(document.querySelectorAll('img'))
        imgs.forEach(i => {
          i.src = new URL(i.getAttribute('src'), base).href
        })
      }
    }, baseURL, this.isNormalizeSourceURL)
  }

  return eva.then(() => {
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
    
    const filename = path.resolve(outputPath, `./${pageURL.pathname}_${search}.html`)
  
    return page.content().then(html => {
      mkdirsSync(path.dirname(filename))
      const writeStream = fs.createWriteStream(filename)
      writeStream.write(html, 'utf8')
      writeStream.end()
    })
  })
}

Crawl.prototype._writeErrorFile = function() {
  const logname = `${new Date().toISOString().replace(/:|\./g, '-')}_icrawl-err.log`
  const dir = path.resolve(os.homedir(), '.icrawl', '_logs')
  mkdirsSync(dir)
  const logpath = path.resolve(dir, logname)
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
    this.server && this.server.close()
    Promise.all(this.pageTrash.map(page => page.close())).finally(() => {
      browser.close()
    })
  } else {
    const nextRoute = routes.shift()
    if (nextRoute) {
      this._crawl(page, nextRoute)
    } else {
      this.pageTrash.push(page)
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
      waitUntil: 'networkidle0',
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
