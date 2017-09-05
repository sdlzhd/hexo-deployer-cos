'use strict';

const path = require('path');
const fs = require('hexo-fs');
const chalk = require('chalk');
const COS = require('cos-nodejs-sdk-v5');
const util = require('../node_modules/cos-nodejs-sdk-v5/sdk/util.js');

module.exports = function(args) {
    let publicDir = this.public_dir;
    let log = this.log;
    let localFileList = new Map();

    // check the config
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
        return;
    }

    // create COS object
    const cos = new COS({
        AppId: args.appId,
        SecretId: args.secretId,
        SecretKey: args.secretKey,
    });

    // get all local files
    getFiles(publicDir, (file) => {
        localFileList.set(
            getUploadPath(file, path.basename(publicDir)),
            file
        );
    });
    // counter about the cos's files
    let cosCounter = 0;
    // get the files from cos
    getCosFiles(cos, {
        bucket: args.bucket,
        region: args.region,
    }, (cosFileMap) => {
        cosFileMap.forEach((item) => {
            if (localFileList.has(item.key)) {
                util.getFileMd5(
                    fs.createReadStream(localFileList.get(item.key)),
                    (err, md5) => {
                        if (err) {
                            console.log(err);
                        } else {
                            if (md5 === item.eTag.substring(1, 33)) {
                                localFileList.delete(item.key);
                            }
                        }
                        cosCounter++;
                        if (cosCounter === cosFileMap.size) {
                            let localCounter = 0;
                            let success = 0;
                            let failed = [];
                            // finshed, upload!
                            log.info(localFileList.size
                                + ' files will be uploaded');
                            log.info('Start uploading to COS...');
                            localFileList.forEach((item, key)=>{
                                cos.putObject({
                                    Bucket: args.bucket,
                                    Region: args.region,
                                    Key: key,
                                    Body: fs.createReadStream(item),
                                    ContentLength: fs.statSync(item).size,
                                }, (err, data)=>{
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        success++;
                                    }
                                    localCounter++;
                                    if (localCounter === localFileList.size) {
                                        log.info(
                                            chalk.green(success + '/' + localCounter)
                                            + ' files have uploaded successfully');
                                        // There are files that failed to upload
                                        if (success !== localFileList.size) {
                                            // doSoming
                                        }
                                    }
                                });
                            });
                        }
                    });
            } else {
                cosCounter++;
            }
        });
    });
};

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
        let cosFileMap = new Set();
        if (err) console.log(err);

        data.Contents.forEach((item) => {
            cosFileMap.add({
                key: item.Key,
                eTag: item.ETag,
            });
        });
        callback(cosFileMap);
        return;
    });
}
