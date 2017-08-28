# hexo-deployer-cos
Tencent Cloud Object Storage (COS) plugin of Hexo

## Installation

>$ npm install hexo-deployer-cos --save

## Options

You must configure in _config.yml as follows:

```yaml
deploy: 
  type: cos
  appId: yourAppId
  secretId: yourSecretId
  secretKey: yourSecretKey
  bucket: yourBucketName
  region: yourRegion
```

You can get the AppId, SecretId, SecretKey on your Tencent Cloud Console.

## Opinions and suggestions

You can commit your opinions and suggestions to Issues, or send mail to [hexo-deployer-cos@zhendong.li](mailto:hexo-deployer-cos@zhendong.li).

## License

MIT
