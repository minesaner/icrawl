/**
 * @param url String
 * @param root PageRoute
 * @param referer PageRoute
 */
function PageRoute(url, root = null, referer = null) {
  this.url = url
  this.root = root
  this.referer = referer
}

PageRoute.prototype.depth = function() {
  let depth = 0
  let current = this

  while (current.root) {
    depth += 1
    current = current.referer
  }

  return depth
}

PageRoute.prototype.toString = function() {
  return this.url
}

module.exports = PageRoute
