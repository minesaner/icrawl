const fs = require('fs')
const path = require('path')

function mkdirsSync(dirs) {
  if (!fs.existsSync(dirs)) {
    const dirname = path.dirname(dirs)

    if (!fs.existsSync(dirname)) {
      mkdirsSync(dirname)
    }
    fs.mkdirSync(dirs)
  }
}

module.exports = mkdirsSync
