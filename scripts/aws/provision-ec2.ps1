# ==============================================================================
# AdhocX AWS EC2 Automated Provisioning Script
# Region: ap-south-1 (Mumbai)
# Instance Type: t3.small (2 vCPU, 2 GiB RAM + 2 GiB Swap)
# ==============================================================================

$ErrorActionPreference = "Continue"

$Region = "ap-south-1"
$KeyName = "adhocx-production-key"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$KeyFile = Join-Path $ProjectRoot "adhocx-production-key.pem"
$SgName = "adhocx-production-sg"
$InstanceType = "t3.small"
$AmiId = "ami-0c0fd09cfe77b59dc" # Ubuntu 24.04 LTS Noble Numbat (ap-south-1)
$UserDataPath = Join-Path $ScriptDir "user-data.sh"

Write-Host "Starting AdhocX AWS Infrastructure Provisioning in [$Region]..." -ForegroundColor Cyan

# 1. Check or Create EC2 Key Pair
Write-Host "Checking Key Pair [$KeyName]..."
$existingKey = aws ec2 describe-key-pairs --region $Region --key-names $KeyName 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue

if (-not $existingKey -or -not $existingKey.KeyPairs) {
    Write-Host "Creating new Key Pair [$KeyName]..." -ForegroundColor Yellow
    $newKey = aws ec2 create-key-pair --region $Region --key-name $KeyName --query "KeyMaterial" --output text
    [System.IO.File]::WriteAllText($KeyFile, $newKey, [System.Text.Encoding]::ASCII)
    Write-Host "Private key saved to: $KeyFile" -ForegroundColor Green
} else {
    Write-Host "Key Pair [$KeyName] already exists in AWS." -ForegroundColor Green
}

# 2. Check or Create Security Group
Write-Host "Checking Security Group [$SgName]..."
$existingSg = aws ec2 describe-security-groups --region $Region --group-names $SgName 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue

if (-not $existingSg -or -not $existingSg.SecurityGroups) {
    Write-Host "Creating Security Group [$SgName]..." -ForegroundColor Yellow
    $sgJson = aws ec2 create-security-group --region $Region --group-name $SgName --description "AdhocX Production Security Group (Web, API, SSH)" | ConvertFrom-Json
    $sgId = $sgJson.GroupId
    Write-Host "Created Security Group ID: $sgId" -ForegroundColor Green

    Write-Host "Adding Inbound Rules (22, 80, 443, 7001, 7002, 7003)..."
    aws ec2 authorize-security-group-ingress --region $Region --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --region $Region --group-id $sgId --protocol tcp --port 80 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --region $Region --group-id $sgId --protocol tcp --port 443 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --region $Region --group-id $sgId --protocol tcp --port 7001 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --region $Region --group-id $sgId --protocol tcp --port 7002 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --region $Region --group-id $sgId --protocol tcp --port 7003 --cidr 0.0.0.0/0
} else {
    $sgId = $existingSg.SecurityGroups[0].GroupId
    Write-Host "Using existing Security Group ID: $sgId" -ForegroundColor Green
}

# 3. Check for existing EC2 instance
Write-Host "Checking for existing running instance [adhocx-production]..."
$instances = aws ec2 describe-instances --region $Region --filters "Name=tag:Name,Values=adhocx-production" "Name=instance-state-name,Values=pending,running" | ConvertFrom-Json

if ($instances.Reservations -and $instances.Reservations.Instances.Count -gt 0) {
    $instance = $instances.Reservations[0].Instances[0]
    $instanceId = $instance.InstanceId
    $publicIp = $instance.PublicIpAddress
    $publicDns = $instance.PublicDnsName
    Write-Host "Found existing running instance: $instanceId" -ForegroundColor Green
} else {
    Write-Host "Launching new EC2 instance ($InstanceType, 25GB gp3)..." -ForegroundColor Yellow

    $userDataBytes = [System.IO.File]::ReadAllBytes($UserDataPath)
    $userDataBase64 = [System.Convert]::ToBase64String($userDataBytes)
    $blockDeviceMapping = '[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":25,\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]'

    $runRes = aws ec2 run-instances --region $Region --image-id $AmiId --instance-type $InstanceType --key-name $KeyName --security-group-ids $sgId --block-device-mappings $blockDeviceMapping --user-data $userDataBase64 --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=adhocx-production},{Key=Project,Value=AdhocX}]" | ConvertFrom-Json

    $instanceId = $runRes.Instances[0].InstanceId
    Write-Host "Instance launched: $instanceId. Waiting for running state..." -ForegroundColor Green

    aws ec2 wait instance-running --region $Region --instance-ids $instanceId
    Write-Host "Instance is now RUNNING!" -ForegroundColor Green

    $desc = aws ec2 describe-instances --region $Region --instance-ids $instanceId | ConvertFrom-Json
    $publicIp = $desc.Reservations[0].Instances[0].PublicIpAddress
    $publicDns = $desc.Reservations[0].Instances[0].PublicDnsName
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "AdhocX AWS EC2 Instance Ready!" -ForegroundColor Green
Write-Host "Instance ID : $instanceId"
Write-Host "Public IP   : $publicIp"
Write-Host "Public DNS  : $publicDns"
Write-Host "Region      : $Region"
Write-Host "SSH Key     : $KeyFile"
Write-Host "SSH Command : ssh -i $KeyFile ubuntu@$publicIp"
Write-Host "========================================================`n" -ForegroundColor Cyan

# Save host information locally (git-ignored)
$serverInfo = @"
EC2_INSTANCE_ID=$instanceId
EC2_PUBLIC_IP=$publicIp
EC2_PUBLIC_DNS=$publicDns
EC2_REGION=$Region
EC2_KEY_FILE=$KeyFile
"@
Set-Content -Path (Join-Path $ProjectRoot ".env.ec2") -Value $serverInfo
