# GitHub 云端打包 APK - 一键推送脚本
# 用法：
#   1. 先在 GitHub 创建空仓库（不要勾选 README）
#   2. 运行: .\push-to-github.ps1 -RepoUrl "https://github.com/你的用户名/仓库名.git"

param(
    [Parameter(Mandatory = $true)]
    [string]$RepoUrl
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ">>> 检查 Git 状态..." -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
    git init
    git branch -M main
}

$status = git status --porcelain
if ($status) {
    git add .
    git commit -m "更新项目文件"
}

Write-Host ">>> 配置远程仓库..." -ForegroundColor Cyan
$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

Write-Host ">>> 推送到 GitHub..." -ForegroundColor Cyan
git branch -M main
git push -u origin main

Write-Host ""
Write-Host "推送成功!" -ForegroundColor Green
Write-Host ""
Write-Host "接下来：" -ForegroundColor Yellow
Write-Host "  1. 打开 GitHub 仓库 -> Actions"
Write-Host "  2. 等待 Build Android APK 完成（约 5-10 分钟）"
Write-Host "  3. 进入成功的运行记录 -> Artifacts -> 下载 tropical-fruit-collector-apk"
Write-Host "  4. 解压得到 app-debug.apk，传到手机安装"
