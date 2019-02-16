'use strict'

const crypto = require('crypto')

let getFileMd5 = function (readStream, callback) {
  let md5 = crypto.createHash('md5')
  readStream.on('data', function (chunk) {
    md5.update(chunk)
  })
  readStream.on('error', function (err) {
    callback(err)
  })
  readStream.on('end', function () {
    let hash = md5.digest('hex')
    callback(null, hash)
  })
}

let util = {
  getFileMd5: getFileMd5
}

module.exports = util
