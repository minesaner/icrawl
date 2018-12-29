# icrawl
Crawl pages and generate `html`s corresponding to the path.  

## Features
- With nginx, you can do **SEO** on the front-end rendered page.
- Built-in server, you can directly crawl the page based on the built folder
- The html save path corresponds to the url path
- Does not depend on any front-end framework
- Provide API calls and command line calls

## Examples
### Node API
```javascript
const path = require('path')
const Crawl = require('icrawl')
const crawl = new Crawl({
  requestTimeout: 10000,
  isNormalizeSourceURL: true,
  routes: [
    'https://nodejs.org/api/path.html',  
    'https://nodejs.org/api/url.html'
  ],
  path: path.resolve(__dirname, 'static')
})
crawl.start()
```
### Configuration
**.icrawlrc.js** in your project root  
```javascript
const path = require('path')

module.exports = {
  isNormalizeSourceURL: true,
  routes: [
    'https://nodejs.org/api/path.html',  
    'https://nodejs.org/api/url.html'
  ],
  path: path.resolve(__dirname, 'static')
}
```
**package.json**
```json
"scripts": {
  "build": "icrawl"
}
```

## options
* `options` &lt;Object&gt;  
  * `viewport` &lt;Object&gt; viewport size  
    * `width` &lt;Number&gt;  
    * `height` &lt;Number&gt;
  * `maxPageCount` &lt;Number&gt; Number of pages that can be opened in parallel, default: `10`  
  * `isNormalizeSourceURL` &lt;Boolean | Object&gt; Whether to convert the relative path of images, anchors, links, scripts to absolute paths in your crawled html, for example, When you crawl the page url is `http://www.example.com/example`, it will be `/favicon.ico` to `http://www.example.com/favicon.ico`. You can also set each option individually. default: `false`
    * `links` &lt;Boolean&gt;
    * `images` &lt;Boolean&gt;
    * `scripts` &lt;Boolean&gt;
    * `anchors` &lt;Boolean&gt;
  * `requestTimeout` &lt;Number&gt; Number of milliseconds for request timeout, default: `30000ms`, set to `0` to wait indefinitely  
  * `host` &lt;String&gt; default: `''`  
  * `routes` &lt;Array&lt;String&gt;&gt; The list of routes to be crawled, the relative path needs to set the `host` option  
  * `outputPath` &lt;String&gt; Html saved directory  
  * `saveHTML` &lt;Boolean&gt; Whether to save the crawl page as html, default: `true`  
  * `depth` &lt;Number | Object&gt; Specify page depth if it is a `Number`, The A page is configured on the routes, the A (`depth`: 0) page contains a link to B (`depth`: 1), and the B page contains a link to C (`depth`: 2), default: `0`
    * `value` &lt;Number&gt; page depth  
    * `include` &lt;RegExp&gt; Included link, default: `null`  
    * `exclude` &lt;RegExp&gt; Excluded link, default: `null`  
    * `after` &lt;Function(Array&lt;PageRoute&gt;)&gt; Callback after page link collection is complete, default: `null`
  * `serverConfig` &lt;String | Object&gt; If the page to be crawled is not on a server, you can specify this option to start a server locally. If it is a `String`, specify the directory where the page is located. default: `null`
    * `path` &lt;String&gt; The directory where the page is located, for example, your `build` directory path, then you can run `icrawl` after `build` command or put two commands together in `scripts`
    * `port` &lt;Number&gt; default: `3333`
    * `public` &lt;String&gt; This option needs to be specified when the `isNormalizeSourceURL` option is specified as `true` at the same time. Relative paths will be converted relative to this option
    * `isFallback` &lt;Boolean&gt; For SPA, alwalys change the requested location to the `index.html`
  * `requestInterception` &lt;Object&gt; Filter requests, use this configuration reasonably to speed up crawling. For example, we don't need to wait for images, css, fonts, third-party scripts to load, after all, we only need to save the rendered `html` most of the time
    * `include` &lt;RegExp&gt;
    * `exclude` &lt;RegExp&gt; 
  * `progressBarStyle` &lt;Object&gt; Progress bar style
    * `prefix` &lt;String&gt; default: `''`
    * `suffix` &lt;String&gt; default: `''`
    * `remaining` &lt;String&gt; default: `'░'`
    * `completed` &lt;String&gt; default: `'█'`

## crawl.start()
`return`: Promise

## PageRoute
* `url` &lt;String&gt; The page url to crawl  
* `root` &lt;PageRoute&gt; The `root` of chain  
* `referer` &lt;PageRoute&gt; The parent of this url

## Tips
* By configuring [nginx](./nginx.conf), you can enable **SEO** for front-end rendering pages.  
* If you use nginx you will need to install the [set-misc-nginx-module](https://github.com/openresty/set-misc-nginx-module) module, or install the [OpenResty](http://openresty.org/cn/installation.html) directly.  

## License
[MIT licensed](./LICENSE).
