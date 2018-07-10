# hexo-deployer-cos

Tencent Cloud Object Storage (COS) plugin of Hexo

## Introduce

COS is one of the best static blog hosting platforms, you can enable CDN and configure Https.

*hexo-deployer-cos* allows you to publish your Hexo blog directly using commands `hexo d`.

## Installation

>$ npm install hexo-deployer-cos --save

## Options

You must configure in _config.yml as follows:

```yaml
deploy: 
  type: cos
  secretId: yourSecretId
  secretKey: yourSecretKey
  bucket: yourBucketName-AppId
  region: yourRegion
```

You can get the AppId, SecretId, SecretKey on your Tencent Cloud Console.

## Release Notes

1. repair Bug

    1.1 Upload failed when the file in COS was empty

2. Optimize upload logic


## Opinions and suggestions

You can commit your opinions and suggestions to Issues, or send mail to [hexo-deployer-cos@zhendong.li](mailto:hexo-deployer-cos@zhendong.li).

## License

MIT
