```bash
./tool01.sh
```

```bash
aws lambda publish-layer-version --layer-name "FB_webhook_layer"  --description "basic_layer" --zip-file fileb://lambda_layer/lambda_layer.zip --compatible-runtimes nodejs18.x --compatible-architectures "x86_64"


```
