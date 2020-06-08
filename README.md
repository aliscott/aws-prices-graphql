terraform plan -out=output
terraform show -json output > output.json

aws ec2 describe-images --owners amazon --filters "Name=platform,Values=windows" | jq '.Images[].ImageId'