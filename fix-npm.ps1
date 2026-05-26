# Fix corrupted @npmcli/config package.json
$configPath = "C:\Program Files\nodejs\node_modules\npm\node_modules\@npmcli\config\package.json"
$validJson = @'
{
  "name": "@npmcli/config",
  "version": "8.0.0",
  "description": "Configuration parsing for npm",
  "main": "lib/index.js",
  "license": "ISC"
}
'@
$validJson | Out-File -FilePath $configPath -Encoding utf8 -Force
Write-Output "Fixed $configPath"

# Verify
$content = Get-Content $configPath -Raw
Write-Output "Verification:"
Write-Output $content.Substring(0, [Math]::Min(100, $content.Length))
