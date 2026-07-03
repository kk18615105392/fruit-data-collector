# 热带水果采集 App - APK 构建脚本
# 需要先安装 Android Studio 并配置 ANDROID_HOME

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (-not $env:ANDROID_HOME) {
    $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path $defaultSdk) {
        $env:ANDROID_HOME = $defaultSdk
        Write-Host "已自动设置 ANDROID_HOME: $defaultSdk"
    } else {
        Write-Host "错误: 未找到 Android SDK。请先安装 Android Studio。" -ForegroundColor Red
        Write-Host "下载地址: https://developer.android.com/studio"
        exit 1
    }
}

Write-Host ">>> 安装依赖..." -ForegroundColor Cyan
npm install

Write-Host ">>> 构建 Web 资源..." -ForegroundColor Cyan
npm run build

Write-Host ">>> 同步到 Android..." -ForegroundColor Cyan
npx cap sync android

Write-Host ">>> 构建 Debug APK..." -ForegroundColor Cyan
Set-Location android
.\gradlew assembleDebug

$apkPath = "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $fullPath = (Resolve-Path $apkPath).Path
    Write-Host ""
    Write-Host "APK 构建成功!" -ForegroundColor Green
    Write-Host "文件位置: $fullPath"
} else {
    Write-Host "APK 未找到，请检查 Gradle 构建日志。" -ForegroundColor Red
    exit 1
}
