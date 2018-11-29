function Progress() {
  this.remain = '░'
  this.complete = '█'
  this.totalLength = 25
  this.percent = 0
  this.progressBar = Array(this.totalLength).fill(this.remain).join('')
}

Progress.prototype.setPercent = function (percent) {
  val = Math.min(1, Math.max(percent, 0))
  this.percent = percent
  this.update()
}

Progress.prototype.update = function () {
  const {percent, totalLength} = this
  const completeLength = Math.floor(percent * totalLength)

  this.progressBar = Array(completeLength)
    .fill(this.complete)
    .concat(
      Array(totalLength - completeLength)
      .fill(this.remain)
    ).join('')
}

module.exports = Progress
