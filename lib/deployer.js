'use strict';

const path = require('path');
const fs = require('hexo-fs');
const chalk = require('chalk');
const Promise = require('bluebird');
const COS = require('cos-nodejs-sdk-v5');

module.exports = function(args) {
    let publicDir = this.public_dir;
    let log = this.log;
    let uploadFileList = [];

    if (!args.appId ||
        !args.secretId ||
        !args.secretKey ||
        !args.bucket ||
        !args.region) {
        let tips = [
            chalk.red('Ohh~We\'re having some trouble!'),
            'Please check if you have made the following settings',
            '',
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

    const cos = new COS({
        AppId: args.appId,
        SecretId: args.secretId,
        SecretKey: args.secretKey,
    });

    // get all files
    getFiles(publicDir, (file) => {
        uploadFileList.push({
            key: getUploadPath(file, path.basename(publicDir)),
            filePath: file,
        });
    });

    log.info(chalk.green('Start uploading to COS...'));

    return Promise.all(uploadFileList.map((item) => {
        // cos.sliceUploadFile({
        //     Bucket: args.bucket,
        //     Region: args.region,
        //     Key: item.key,
        //     FilePath: item.filePath
        // }, (err, data) => {
        //     if (err) {
        //         log.error(err.error.Code);
        //     } else {
        //         log.info(data.Key);
        //     }
        // })
        return cos.sliceUploadFile({
            Bucket: args.bucket,
            Region: args.region,
            Key: item.key,
            FilePath: item.filePath,
        }).then((data) => {
            log.info(data.Key);
        }).error((err) => {
            log.error(err.error.Code);
        });
    }));
};

/**
 * 遍历目录，获取文件列表
 * @param {string} dir
 * @param {function}  handle
 */
function getFiles(dir, handle) {
    let files = fs.listDirSync(dir);
    files.forEach((filePath) => {
        let absPath = path.join(dir, filePath);
        let stat = fs.statSync(absPath);
        if (stat.isDirectory()) {
            uploadFiles(absPath, handle);
        } else {
            handle(absPath);
        }
    });
}

/**
 *
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
