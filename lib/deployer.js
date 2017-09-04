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

    // get all files
    getFiles(publicDir, (file) => {
        localFileList.set(
            getUploadPath(file, path.basename(publicDir)),
            file
        );
    });

    // 获取cos上的文件
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
                    });
            }
        });
    });
    // start uploading
    log.info(chalk.green('Start uploading to COS...'));

    // localFileList.forEach((item) => {
    //     let upload = uploadFiles(item, cos, {
    //         bucket: args.bucket, region: args.region,
    //     });
    //     console.log(upload.next());
    // });
    // let putObject = thunkify(cos.putObject);
    // co(function* () {
    //     yield putObject({
    //         Bucket: args.bucket,
    //         Region: args.region,
    //         Key: localFileList[2].key,
    //         Body: fs.createReadStream(localFileList[2].filePath),
    //         ContentLength: fs.statSync(localFileList[2].filePath).size,
    //     }, yield (err, data) => {
    //         console.log(err|)
    //     });
    // });
    // let test = uploadFiles(localFileList[1], cos, {
    //     Bucket: args.bucket,
    //     Region: args.region,
    //     Key: localFileList[1].key,
    //     Body: fs.createReadStream(localFileList[2].filePath),
    //     ContentLength: fs.statSync(localFileList[2].filePath).size,
    // });
    // console.log(test);
    // let upload = uploadFiles(localFileList[1], cos, {
    //     bucket: args.bucket, region: args.region,
    // });
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
