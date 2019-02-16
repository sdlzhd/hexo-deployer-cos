'use strict'

const os = require('os')
const fs = require('hexo-fs')
const chalk = require('chalk')
const COS = require('cos-nodejs-sdk-v5')
const path = require('path')
const crypto = require('crypto')

module.exports = function (args) {
  // Hexo's Logger
  let log = this.log

  // Check the user's configuration
  if (!checkHexoConfig(args)) {
    log.error('hexo-deployer-cos: config error')
    return
  }

  // Get local files list from Public Directory
  let localFiles = fs.listDirSync(this.public_dir)
  // Replace path specific in windows
  if (os.platform() === 'win32') {
    for (let i = 0; i < localFiles.length; i++) {
      localFiles[i] = localFiles[i].replace(/\\/g, '/')
    }
  }

  // Create COS object
  let cos = createCOS({
    SecretId: args.secretId,
    SecretKey: args.secretKey
  })

  // Bucket's configuration
  const bucketConfig = {
    Bucket: args.bucket,
    Region: args.region
  }

  // 本地和COS都存在的文件，需要上传
  let intersect
  // 本地存在，COS不存在的文件
  let diffLocal
  // COS存在，本地不存在的文件
  let diffRemote
  // Get the files on the COS
  getFilesFromCOS(cos, bucketConfig)
    .catch(err => {
      log.error(err)
    }).then(remoteFiles => {
      let local = new Set(localFiles)

      intersect = new Set(remoteFiles.filter(x => local.has(x.Key)))
      diffLocal = localFiles.filter(x => {
        for (let i = 0; i < remoteFiles.length; i++) {
          if (x === remoteFiles[i].Key) {
            return false
          }
        }
        return true
      })
      diffRemote = new Set(remoteFiles.filter(x => !local.has(x.Key)))
      // 比对本地文件和COS文件差异
      // 计算本地文件MD5
      let basepath = path.basename(this.public_dir)
      intersect.forEach(obj => {
        getFileMd5(fs.createReadStream(basepath + path.sep + obj.Key), (err, md5) => {
          if (err) {
            console.log('MD5计算失败,{}', err)
          }
          if (obj.ETag !== md5) {
            intersect.add(obj)
            uploadFileToCOS(cos, bucketConfig, basepath + path.sep + obj.Key)
              .catch(err => {
                console.log(err)
              }).then(data => {
                console.log(data)
              })
          }
        })
      })
    })
}

/**
 * 检查 Hexo 的配置是否正确
 * @param {string} args
 * @return {boolean} 配置不正确的时候，返回 false
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
 * Create COS object
 * @param {object} config
 */
function createCOS (config) {
  return new COS(config)
}

/**
 * 获取 Bucket 中的文件数据
 * @param {object} cos
 * @param {object} config
 */
function getFilesFromCOS (cos, config) {
  return new Promise((resolve, reject) => {
    cos.getBucket(config, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data.Contents)
      }
    })
  })
}

/**
 * upload file
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
      Body: fs.createReadStream(file.path),
      onProgress: () => {
        console.log('=========' + this.progressData)
      }
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
 * Batch delete files on the COS
 * @param {object} cos
 * @param {object} config
 * @param {Array} fileList
 */
function deleteFileFromCOS (cos, config, fileList) {
  return new Promise((resolve, reject) => {
    cos.deleteMultipleObject({
      Bucket: config.Bucket,
      Region: config.Region,
      Objects: fileList
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

function getFileMd5 (readStream, callback) {
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
