# ==============================================================================
# Sync Production Secrets to GitHub Repository (Prince364133/adhocx)
# Reads values securely from local .env.aws, .env.ec2, and .env
# ==============================================================================

$Repo = "Prince364133/adhocx"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$KeyFile = Join-Path $ProjectRoot "adhocx-production-key.pem"
$Ec2EnvFile = Join-Path $ProjectRoot ".env.ec2"
$AwsEnvFile = Join-Path $ProjectRoot ".env.aws"
$EnvFile = Join-Path $ProjectRoot ".env"

Write-Host "Syncing Production Secrets to GitHub Repo: [$Repo]..." -ForegroundColor Cyan

function Get-EnvMap($path) {
    $map = @{}
    if (Test-Path $path) {
        Get-Content $path | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and ($line -match '^([^=]+)=(.*)$')) {
                $k = $matches[1].Trim()
                $v = $matches[2].Trim()
                $map[$k] = $v
            }
        }
    }
    return $map
}

$awsMap = Get-EnvMap $AwsEnvFile
$ec2Map = Get-EnvMap $Ec2EnvFile
$envMap = Get-EnvMap $EnvFile

# 1. AWS IAM Credentials
$awsKeyId = if ($awsMap.AWS_ACCESS_KEY_ID) { $awsMap.AWS_ACCESS_KEY_ID } else { $env:AWS_ACCESS_KEY_ID }
$awsSecret = if ($awsMap.AWS_SECRET_ACCESS_KEY) { $awsMap.AWS_SECRET_ACCESS_KEY } else { $env:AWS_SECRET_ACCESS_KEY }
$awsRegion = if ($awsMap.AWS_REGION) { $awsMap.AWS_REGION } else { "ap-south-1" }

if ($awsKeyId -and $awsSecret) {
    Write-Host "Setting AWS Credentials..."
    gh secret set AWS_ACCESS_KEY_ID --body "$awsKeyId" --repo $Repo
    gh secret set AWS_SECRET_ACCESS_KEY --body "$awsSecret" --repo $Repo
    gh secret set AWS_REGION --body "$awsRegion" --repo $Repo
}

# 2. EC2 SSH Credentials
if (Test-Path $KeyFile) {
    Write-Host "Setting EC2 SSH Key..."
    $sshKeyContent = [System.IO.File]::ReadAllText($KeyFile)
    gh secret set EC2_SSH_KEY --body "$sshKeyContent" --repo $Repo
    gh secret set EC2_USERNAME --body "ubuntu" --repo $Repo
}

# 3. Read EC2 Public IP if available
if ($ec2Map.EC2_PUBLIC_IP) {
    $ec2Host = $ec2Map.EC2_PUBLIC_IP
    Write-Host "Setting EC2_HOST to $ec2Host..."
    gh secret set EC2_HOST --body "$ec2Host" --repo $Repo
}

# 4. Core Application Secrets
Write-Host "Setting Database and Application Secrets..."
gh secret set POSTGRES_USER --body "adhocx_user" --repo $Repo
gh secret set POSTGRES_PASSWORD --body "adhocx_password" --repo $Repo
gh secret set POSTGRES_DB --body "adhocx" --repo $Repo
$dbUrl = if ($envMap.DATABASE_URL) { $envMap.DATABASE_URL } else { "postgresql://adhocx_user:adhocx_password@postgres:5432/adhocx?schema=public" }
gh secret set DATABASE_URL --body "$dbUrl" --repo $Repo

$redisUrl = if ($envMap.REDIS_URL) { $envMap.REDIS_URL } else { "redis://redis:6379" }
gh secret set REDIS_URL --body "$redisUrl" --repo $Repo
gh secret set REDIS_TLS --body "false" --repo $Repo
$jwtAccess = if ($envMap.JWT_ACCESS_SECRET) { $envMap.JWT_ACCESS_SECRET } else { "adhocx_prod_jwt_access_secret_token_key_64_characters_2026" }
$jwtRefresh = if ($envMap.JWT_REFRESH_SECRET) { $envMap.JWT_REFRESH_SECRET } else { "adhocx_prod_jwt_refresh_secret_token_key_64_characters_2026" }
gh secret set JWT_ACCESS_SECRET --body "$jwtAccess" --repo $Repo
gh secret set JWT_REFRESH_SECRET --body "$jwtRefresh" --repo $Repo

# 5. Third-Party Integrations
foreach ($key in @("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "GEMINI_API_KEY", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_ENDPOINT", "R2_PUBLIC_URL", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM_NAME", "SMTP_FROM_EMAIL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_PROJECT_ID")) {
    if ($envMap[$key]) {
        $val = $envMap[$key]
        gh secret set $key --body "$val" --repo $Repo
    }
}

Write-Host "All GitHub Secrets successfully synced to repo." -ForegroundColor Green
