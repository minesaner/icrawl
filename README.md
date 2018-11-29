# icrawl
Crawl pages and generate `html`s corresponding to the path.  

## Example
```javascript
const path = require('path')
const Crawl = require('icrawl')
const crawl = new Crawl({
  requestTimeout: 10000,
  routes: [
    'https://nodejs.org/api/path.html',  
    'https://nodejs.org/api/url.html'
  ],
  path: path.resolve(__dirname, 'static')
})
crawl.start()
```

## new Crawl(options)  
* `options` &lt;Object&gt;  
  * `viewport` &lt;Object&gt; viewport size  
    * `width` &lt;Number&gt;  
    * `height` &lt;Number&gt;
  * `maxPageCount` &lt;Number&gt; Number of pages that can be opened in parallel, default: `10`  
  * `requestTimeout` &lt;Number&gt; Number of milliseconds for request timeout, default: `30000ms`, set to `0` to wait indefinitely  
  * `host` &lt;String&gt; default: `''`  
  * `routes` &lt;Array&lt;String&gt;&gt; The list of routes to be crawled, the relative path needs to set the `host` parameter  
  * `outputPath` &lt;String&gt; Html saved directory  
  * `saveHTML` &lt;Boolean&gt; Whether to save the crawl page as html, default: `true`  
  * `depth` &lt;Number | Object&gt; Specify page depth if it is a `Number`, The A page is configured on the routes, the A (`depth`: 0) page contains a link to B (`depth`: 1), and the B page contains a link to C (`depth`: 2), default: `0`.
    * `value` &lt;Number&gt; page depth  
    * `include` &lt;Regexp&gt; Included link, default: `null`  
    * `exclude` &lt;Regexp&gt; Excluded link  
    * `after` &lt;Function(Array&lt;PageRoute&gt;)&gt; Callback after page link collection is complete, default: `null`

## crawl.start()

## PageRoute
### url chain
* `url` &lt;String&gt; The page url to crawl  
* `root` &lt;PageRoute&gt; The `root` of chain  
* `referer` &lt;PageRoute&gt; The parent of this url

## Tips
* By configuring [nginx](./nginx.conf), you can enable **SEO** for front-end rendering pages.  
* If you use nginx you will need to install the [set-misc-nginx-module](https://github.com/openresty/set-misc-nginx-module) module, or install the [OpenResty](http://openresty.org/cn/installation.html) directly.  

