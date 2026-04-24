$Bucket = "srm-fullstack-frontend"
$FrontendDir = Join-Path $PSScriptRoot "frontend"

$OwnershipFile = Join-Path $env:TEMP "s3-ownership.json"
$PolicyFile    = Join-Path $env:TEMP "s3-policy.json"

function Check-Exit {
  param([string]$Step)
  if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED at: $Step" -ForegroundColor Red
    exit 1
  }
}

# 1. Disable all public access blocks
Write-Host "`n[1/4] Disabling public access block on s3://$Bucket ..." -ForegroundColor Cyan
aws s3api put-public-access-block `
  --bucket $Bucket `
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
Check-Exit "put-public-access-block"

# PowerShell 5.1 Set-Content -Encoding utf8 writes a BOM which AWS CLI rejects.
# Use .NET directly with a no-BOM UTF-8 encoder for both JSON files.
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# 2. Set ownership to BucketOwnerPreferred
Write-Host "[2/4] Setting bucket ownership controls ..." -ForegroundColor Cyan
[System.IO.File]::WriteAllText($OwnershipFile, '{
  "Rules": [
    { "ObjectOwnership": "BucketOwnerPreferred" }
  ]
}', $utf8NoBom)

aws s3api put-bucket-ownership-controls `
  --bucket $Bucket `
  --ownership-controls file://$OwnershipFile
Check-Exit "put-bucket-ownership-controls"

# 3. Sync frontend files (no --acl flag)
Write-Host "[3/4] Syncing $FrontendDir -> s3://$Bucket ..." -ForegroundColor Cyan
aws s3 sync $FrontendDir s3://$Bucket --delete
Check-Exit "s3 sync"

# 4. Apply public-read bucket policy
Write-Host "[4/4] Applying public bucket policy ..." -ForegroundColor Cyan
[System.IO.File]::WriteAllText($PolicyFile, "{
  `"Version`": `"2012-10-17`",
  `"Statement`": [{
    `"Effect`": `"Allow`",
    `"Principal`": `"*`",
    `"Action`": `"s3:GetObject`",
    `"Resource`": `"arn:aws:s3:::$Bucket/*`"
  }]
}", $utf8NoBom)

aws s3api put-bucket-policy `
  --bucket $Bucket `
  --policy file://$PolicyFile
Check-Exit "put-bucket-policy"

# 5. Clean up temp files
Remove-Item -Force $OwnershipFile, $PolicyFile -ErrorAction SilentlyContinue

Write-Host "`nDeployed successfully." -ForegroundColor Green
Write-Host "URL: http://$Bucket.s3-website.ap-south-1.amazonaws.com" -ForegroundColor Green
