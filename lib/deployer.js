'use strict'

const fs = require('hexo-fs')
const path = require('path')
const chalk = require('chalk')
const COS = require('cos-nodejs-sdk-v5')

module.exports = function (args) {
  // Hexo's Logger
  let log = this.log

  // Check the user's configuration
  if (!checkHexoConfig(args)) {
    log.error('hexo-deployer-cos: config error')
    return
  }

  // Hexo's path of Public directory
  let publicDir = this.public_dir

  // Local files list
  let localFiles = getFiles(publicDir)

  // COS's configuration
  const cosConfig = {
    SecretId: args.secretId,
    SecretKey: args.secretKey
  }
  // Create COS object
  let cos = createCOS(cosConfig)

  // Bucket's configuration
  const bucketConfig = {
    Bucket: args.bucket,
    Region: args.region
  }

  // List of files to upload
  let uploadFiles = []

  // Get the files on the COS
  getCosFiles(cos, bucketConfig)
    .catch(err => {
      console.log(err)
    }).then(data => {
      let cosFiles = data.map(object => { return path.normalize(object.Key) })
      let set = operationSet(localFiles, cosFiles)
      console.log('交集')
      console.log(set.intersect)
      console.log('差集')
      console.log(set.minus)
      console.log('补集')
      console.log(set.unminus)
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
      '  bucket: yourBucketName-AppId',
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
 * Get a list of local files by Hexo-fs
 * @param {string} dir
 */
function getFiles (dir) {
  let files = fs.listDirSync(dir)
  return files
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
function getCosFiles (cos, config) {
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
function uploadFile (cos, config, file) {
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
function deleteFile (cos, config, fileList) {
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

function sortFiles (localFiles, cosFiles) {
  let setA = new Set(localFiles)
  let setB = new Set(cosFiles)

  let undeterminedFiles = localFiles.filter(x => setB.has(x))
  let uploadFiles = localFiles.filter(x => !setB.has(x))
  let deleteFiles = cosFiles.filter(x => !setA.has(x))

  return {
    undeterminedFiles: undeterminedFiles,
    uploadFiles: uploadFiles,
    deleteFiles: deleteFiles
  }
}
