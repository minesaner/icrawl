const defaultOptions = {
  prefix: '',
  suffix: '',
  remaining: '░',
  completed: '█',
  totalLength: 25,
}
class Progress {
  constructor(options) {
    this.options = Object.assign({}, defaultOptions, options)
  }

  getProgressBar(percent) {
    const {completed, remaining, suffix, prefix, totalLength} = this.options
    percent = Math.min(1, Math.max(percent, 0))
    const completeLength = Math.floor(percent * totalLength)
    const bar = Array(completeLength)
      .fill(completed)
      .concat(
        Array(totalLength - completeLength)
        .fill(remaining)
      ).join('')

    return prefix + bar + suffix
  }
}

module.exports = Progress
