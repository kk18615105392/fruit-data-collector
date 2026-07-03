# Android Studio / Android SDK 下载助手
# 说明：清华镜像已不再提供 Android Studio 和 SDK 下载（版权原因）

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Android 开发环境下载助手" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[重要] 清华镜像现状：" -ForegroundColor Yellow
Write-Host "  mirrors.tuna.tsinghua.edu.cn/android/studio/  -> 404 已下线"
Write-Host "  官方说明：Android SDK 因版权原因，不能提供镜像服务"
Write-Host "  详情: https://mirrors.tuna.tsinghua.edu.cn/help/AOSP/"
Write-Host ""

$choice = Read-Host "请选择 (1=官方国内页下载Android Studio  2=打开清华说明页  3=退出)"

switch ($choice) {
    "1" {
        Write-Host "正在打开 Android Studio 国内官方下载页..." -ForegroundColor Green
        Start-Process "https://developer.android.google.cn/studio"
        Write-Host ""
        Write-Host "请在浏览器中：" -ForegroundColor White
        Write-Host "  1. 勾选同意协议"
        Write-Host "  2. 点击 Download Android Studio"
        Write-Host "  3. 下载 android-studio-*-windows.exe（约 1.5 GB）"
        Write-Host ""
        Write-Host "若仍下载失败，请开启 VPN/代理后重试。" -ForegroundColor Yellow
    }
    "2" {
        Start-Process "https://mirrors.tuna.tsinghua.edu.cn/help/AOSP/"
        Write-Host "已打开清华镜像说明页，请查看「Android SDK 不能提供镜像服务」的提示。" -ForegroundColor Cyan
    }
    default {
        Write-Host "已取消。" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "不想装 Android Studio？项目已支持 GitHub Actions 云端打包 APK：" -ForegroundColor Green
Write-Host "  推送代码到 GitHub -> Actions -> 下载 APK 即可"
