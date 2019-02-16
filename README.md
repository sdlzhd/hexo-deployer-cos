# UPDATING... WILL SOON BE COMPLETION!

# hexo-deployer-cos

Tencent Cloud Object Storage (COS) plugin of Hexo

## Introduce

COS is one of the best static blog hosting platforms, you can enable CDN and configure Https.

*hexo-deployer-cos* allows you to publish your Hexo blog directly using commands `hexo d`.

## Installation

> $ npm install hexo-deployer-cos --save

## Options

You must configure in _config.yml as follows:

```yaml
deploy:
  type: cos
  secretId: yourSecretId
  secretKey: yourSecretKey
  bucket: yourBucket
  region: yourRegion
  root: root #
  exclude: # 上传会以本地文件为准
    - a
    - b
```

You can get this information from your Tencent Cloud Console.

## Release Notes

## Opinions & Suggestions

You can commit your opinions and suggestions to Issues, or send mail to [sdlzhd@vip.qq.com](mailto:sdlzhd@vip.qq.com).

## License

MIT
