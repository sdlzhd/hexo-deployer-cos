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
```

You can get this information from your Tencent Cloud Console.

Go to the [COS Object Storage Console](https://console.cloud.tencent.com/cos5) Create a bucket and get the Bucket (Bucket Name) and [Region](https://cloud.tencent.com/document/product/436/6224) (Region Name).
Go to [Key Management Console](https://console.cloud.tencent.com/capi) Get your project SecretId and SecretKey.

## Release Notes

## Opinions & Suggestions

You can commit your opinions and suggestions to Issues, or send mail to [sdlzhd@outlook.com](mailto:sdlzhd@outlook.com).

## License

MIT
