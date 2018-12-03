#!/usr/bin/env node

const Crawl = require('./index')
const config = require(`${process.cwd()}/.icrawlrc.js`)
const crawl = new Crawl(config)

crawl.start()
