function Progress({prefix, suffix, remaining, completed}) {
  this.remain = remaining
  this.complete = completed
  this.prefix = prefix
  this.suffix = suffix
  this.totalLength = 25
  this.percent = 0
  this.progressBar = this.prefix + Array(this.totalLength).fill(this.remain).join('') + this.suffix
}

Progress.prototype.setPercent = function (percent) {
  val = Math.min(1, Math.max(percent, 0))
  this.percent = percent
  this.update()
}

Progress.prototype.update = function () {
  const {percent, totalLength} = this
  const completeLength = Math.floor(percent * totalLength)
  const bar = Array(completeLength)
    .fill(this.complete)
    .concat(
      Array(totalLength - completeLength)
      .fill(this.remain)
    ).join('')
  this.progressBar = this.prefix + bar + this.suffix
}

module.exports = Progress
