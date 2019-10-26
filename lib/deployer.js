'use strict'

const os = require('os')
const fs = require('hexo-fs')
const chalk = require('chalk')
const COS = require('cos-nodejs-sdk-v5')

module.exports = function (args) {
  // Hexo's Logger
  let log = this.log

  if (!args.secretId) {
    args.secretId = process.env.COS_SECRET_ID
  }
  if (!args.secretKey) {
    args.secretKey = process.env.COS_SECRET_KEY
  }
  if (!args.bucket) {
    args.bucket = process.env.COS_BUCKET
  }
  if (!args.region) {
    args.region = process.env.COS_REGION
  }

  // Check the user's configuration
  if (!checkHexoConfig(args)) {
    log.error('hexo-deployer-cos: config error')
    return
  }

  // Get local files list from Public Directory
  let localFiles = fs.listDirSync(this.public_dir)

  // Create COS object
  let cos = new COS({
    SecretId: args.secretId,
    SecretKey: args.secretKey
  })

  // Bucket's configuration
  const bucketConfig = {
    Bucket: args.bucket,
    Region: args.region
  }

  log.info('Uploading files to COS...')

  return Promise.all(localFiles.map(file => {
    return uploadFileToCOS(cos, bucketConfig, {
      path: this.public_dir + file,
      name: getFileName(file)
    }).catch(err => {
      console.log(err)
    }).then(data => {
      if (data.statusCode === 200) {
        log.info('Done: ', file)
      }
    })
  }))
}

/**
 * Check if the configuration is correct in _config.yml file
 * @param {string} args
 * @return {boolean}
 */
function checkHexoConfig (args) {
  if (!args.secretId ||
    !args.secretKey ||
    !args.bucket ||
    !args.region) {
    let tips = [
      chalk.red('Ohh~We have a little trouble!'),
      'Please check if you have made the following settings',
      'deploy:',
      '  type: cos',
      '  secretId: yourSecretId',
      '  secretKey: yourSecretKey',
      '  bucket: yourBucket',
      '  region: yourRegion',
      '',
      'Need more help? You can check the Tencent cloud document: ' + chalk.underline('https://www.qcloud.com/document/product/436')
    ]
    console.log(tips.join('\n'))
    return false
  } else {
    return true
  }
}

/**
 * Upload file to COS
 * @param {object} cos
 * @param {object} config
 * @param {object} file
 */
function uploadFileToCOS (cos, config, file) {
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: config.Bucket,
      Region: config.Region,
      Key: file.name,
      Body: fs.createReadStream(file.path)
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

/**
 * if OS is Windows, replace the path specific to '/' as filename
 * @param {string} filename
 * @returns {string} filename
 */
function getFileName (filename) {
  if (os.platform() === 'win32') {
    return filename.replace(/\\/g, '/')
  }
  return filename
}
