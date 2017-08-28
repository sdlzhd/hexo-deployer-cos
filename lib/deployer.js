'use strict';

const path = require('path');
const fs = require('hexo-fs');
const chalk = require('chalk');
const COS = require('cos-nodejs-sdk-v5');

module.exports = function(args) {
    let publicDir = this.public_dir;
    let log = this.log;
    let uploadFileList = [];

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
        uploadFileList.push({
            key: getUploadPath(file, path.basename(publicDir)),
            filePath: file,
        });
    });
    // start uploading
    log.info(chalk.green('Start uploading to COS...'));
    uploadFileList.forEach((item) => {
        cos.putObject({
            Bucket: args.bucket,
            Region: args.region,
            Key: item.key,
            Body: fs.createReadStream(item.filePath),
            ContentLength: fs.statSync(item.filePath).size,
        }, (err, data) => {
            console.log(err || data);
        });
    });
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
