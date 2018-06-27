'use strict';

const path = require('path');
const EventEmitter = require('events');
const fs = require('hexo-fs');
const chalk = require('chalk');
const COS = require('cos-nodejs-sdk-v5');
const util = require('./util.js');

module.exports = function(args) {
    let publicDir = this.public_dir;
    let log = this.log;
    let localFileMap = new Map();
    let failedFileList = [];

   if (!checkHexoConfig(args)) {
       return;
   }

    // 获取本地文件
    getFiles(publicDir, (file) => {
        localFileMap.set(
            getUploadPath(file, path.basename(publicDir)),
            file
        );
    });

    // 创建COS对象
    const cos = new COS({
        AppId: args.appId,
        SecretId: args.secretId,
        SecretKey: args.secretKey,
    });

    // 获取COS上的文件
    getCosFiles(cos, {
        bucket: args.bucket,
        region: args.region,
    }, (err, cosFileMap) => {
        if (err) {
            log.info(err);
        } else {
            let sum = cosFileMap.size;
            if (sum === 0) {
                // 上传所有文件
                localFileMap.forEach((filepath, file) => {
                    cos.putObject({
                        Bucket: args.bucket,
                        Region: args.region,
                        Key: file,
                        Body: fs.createReadStream(filepath),
                        ContentLength: fs.statSync(filepath).size,
                    }, (err, data) => {
                        if (err) {
                            console.log(err);
                        } else {
                            log.info('成功:' + filepath);
                        }
                    });
                });
            } else {
                let count = 0;
                let extraFiles = [];
                const iteratorEmitter = new EventEmitter();

                cosFileMap.forEach((eTag, key) => {
                    if (!localFileMap.has(key)) {
                        // 放入待删除的文件列表,计数器+1
                        extraFiles.push(key);
                        ++count;
                        if (count === sum) {
                            iteratorEmitter.emit('finshed');
                        }
                    } else {
                        // 获取此文件的md5
                        util.getFileMd5(
                            fs.createReadStream(localFileMap.get(key)),
                            (err, md5) => {
                                if (md5 === eTag.substring(1, 33)) {
                                    // 从本地文件列表移除,计数器+1
                                    localFileMap.delete(key);
                                    ++count;
                                    if (count === sum) {
                                        iteratorEmitter.emit('finshed');
                                    }
                                } else {
                                    // 计数器+1
                                    ++count;
                                    if (count === sum) {
                                        iteratorEmitter.emit('finshed');
                                    }
                                }
                            });
                    }
                });

                iteratorEmitter.on('finshed', () => {
                    // 开始上传本地文件,并且删除多余的文件
                    localFileMap.forEach((filepath, file) => {
                        cos.putObject({
                            Bucket: args.bucket,
                            Region: args.region,
                            Key: file,
                            Body: fs.createReadStream(filepath),
                            ContentLength: fs.statSync(filepath).size,
                        }, (err, data) => {
                            if (err) {
                                log.error(err);
                            } else {
                                log.info('成功上传:' + filepath);
                            }
                        });
                    });
                    // 删除多余的文件
                    extraFiles.forEach((file)=>{
                        cos.deleteObject({
                            Bucket: args.bucket,
                            Region: args.region,
                            Key: file,
                        }, (err, data) => {
                            if (err) {
                                log.error(err);
                            } else {
                                log.info('成功删除:' + file);
                            }
                        });
                    });
                });
            }
        }
    });
};

/**
 * 检查 Hexo 的配置是否正确
 * @param {string} args
 * @return {string} 配置不正确的时候，返回 false
 */
function checkHexoConfig(args) {
    if (!args.appId ||
        !args.secretId ||
        !args.secretKey ||
        !args.bucket ||
        !args.region) {
        let tips = [
            chalk.red('Ohh~We\'re having some trouble!'),
            'Please check if you have made the following settings',
            'deploy:',
            '  type: cos',
            '  appId: yourAppId',
            '  secretId: yourSecretId',
            '  secretKey: yourSecretKey',
            '  bucket: yourBucketName',
            '  region: yourRegion',
            '',
            'Need more help? You can check the Tencent cloud document: ' + chalk.underline('https://www.qcloud.com/document/product/436'),
        ];
        console.log(tips.join('\n'));
        log.error('hexo-deployer-cos: config error');
        return false;
    } else {
        return true;
    }
}

/**
 * 遍历目录，获取文件列表
 * @param {string} dir
 * @param {function}  callback
 */
function getFiles(dir, callback) {
    let files = fs.listDirSync(dir);
    files.forEach((filePath) => {
        let absPath = path.join(dir, filePath);
        let stat = fs.statSync(absPath);
        if (stat.isDirectory()) {
            uploadFiles(absPath, callback);
        } else {
            callback(absPath);
        }
    });
}

/**
 * 获取上传文件的路径
 * @param {string} absPath
 * @param {string} root
 * @return {string}
 */
function getUploadPath(absPath, root) {
    let pathArr = absPath.split(path.sep);
    let rootIndex = pathArr.indexOf(root);
    pathArr = pathArr.slice(rootIndex + 1);
    return pathArr.join('/');
}

/**
 * 获取 cos 上的所有文件
 * @param {object} cos
 * @param {object} config
 * @param {function} callback
 */
function getCosFiles(cos, config, callback) {
    cos.getBucket({
        Bucket: config.bucket,
        Region: config.region,
    }, (err, data) => {
        let cosFileMap = new Map();
        if (err) {
            console.log(err);
            return;
        }

        data.Contents.forEach((item) => {
            cosFileMap.set(
                item.Key,
                item.ETag
            );
        });
        callback(err, cosFileMap);
    });
}
