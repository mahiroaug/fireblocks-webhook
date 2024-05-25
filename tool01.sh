#!/bin/bash

# How to use:
# ./tool01.sh: zip compression only
# ./tool01.sh -l: Perform Lambda Layer related operations
# ./tool01.sh -f: Perform Lambda function update

# フラグの初期化
layer=0
function=0

# オプションの処理
while getopts lf option
do
  case "${option}"
  in
  l)
    layer=1
    ;;
  f)
    function=1
    ;;
  esac
done

# lオプションが指定された場合のみLayer関連の処理を行う
if [ $layer -eq 1 ]; then
  cd lambda_layer/nodejs
  npm install
  cd ..
  zip -r lambda_layer.zip nodejs
  cd ..

  aws lambda publish-layer-version --layer-name "FB_webhook_layer"  --description "basic_layer" --zip-file fileb://lambda_layer/lambda_layer.zip --compatible-runtimes nodejs18.x --compatible-architectures "x86_64"
fi

# fオプションが指定された場合のみLambda関数の更新を行う
if [ $function -eq 1 ]; then
  cd lambda
  zip -r lambda.zip index.js
  cd ..

  aws lambda update-function-code --function-name web3-fireblocks-webhook-prod --zip-file fileb://lambda/lambda.zip
  aws lambda update-function-code --function-name web3-fireblocks-webhook-testnet2-prod --zip-file fileb://lambda/lambda.zip
  aws lambda update-function-code --function-name web3-fireblocks-webhook-testnet3-prod --zip-file fileb://lambda/lambda.zip
  aws lambda update-function-code --function-name web3-fireblocks-webhook-mainnet1-prod --zip-file fileb://lambda/lambda.zip
fi

# オプションが指定されていない場合は何もしない