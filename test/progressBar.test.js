const Progress = require('../lib/progress')

function combine(completed, remaining, completedFlag, remainingFlag, prefix, suffix) {
  return prefix +
    Array(completed).fill(completedFlag).concat(Array(remaining).fill(remainingFlag)).join('') +
    suffix
}

describe('default options', () => {
  let progress
  beforeAll(() => {
    progress = new Progress()
  })
  it('completed should zero', () => {
    expect(progress.getProgressBar(0)).toEqual(defaultCombine(0))
  })
  it('completed should be five', () => {
    expect(progress.getProgressBar(1 / 5)).toEqual(defaultCombine(5))
  })
  it('completed should be twelve', () => {
    expect(progress.getProgressBar(1 / 2)).toEqual(defaultCombine(12))
  })
  it('completed should be twenty five', () => {
    expect(progress.getProgressBar(1)).toEqual(defaultCombine(25))
  })
  function defaultCombine(completed) {
    return combine(completed, 25 - completed, '█', '░', '', '')
  }
})

describe('custom options', () => {
  let progress
  beforeAll(() => {
    progress = new Progress({
      prefix: '[',
      suffix: ']',
      remaining: '-',
      completed: '#'
    })
  })
  it('completed should be zero', () => {
    expect(progress.getProgressBar(0)).toEqual(customCombine(0))
  })
  it('completed should be five', () => {
    expect(progress.getProgressBar(1 / 5)).toEqual(customCombine(5))
  })
  it('completed should be twelve', () => {
    expect(progress.getProgressBar(1 / 2)).toEqual(customCombine(12))
  })
  it('completed should be twenty five', () => {
    expect(progress.getProgressBar(1)).toEqual(customCombine(25))
  })
  function customCombine(completed) {
    return combine(completed, 25 - completed, '#', '-', '[', ']')
  }
})
