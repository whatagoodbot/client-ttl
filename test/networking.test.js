import { buildUrl } from '../src/utils/networking.js'
import { expect } from 'chai'

describe('networking', function () {
  it('should return an info logging function', () => {
    expect(buildUrl).to.be.a('function')
  })
})
