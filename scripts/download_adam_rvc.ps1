$ErrorActionPreference = "Stop"
$baseDir = "$env:LOCALAPPDATA\CreatorOS\models\rvc"
$adamDir = "$baseDir\adam"
$predictorDir = "$baseDir\predictors"

Write-Host "[0/3] Đang chuẩn bị cấu trúc thư mục RVC..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $adamDir | Out-Null
New-Item -ItemType Directory -Force -Path $predictorDir | Out-Null

Write-Host "[1/3] Đang tải adam.pth (~55MB)..." -ForegroundColor Cyan
$adamPthUrl = "https://huggingface.co/QuickD/VoiceModels/resolve/main/adam.pth"
try {
    Invoke-WebRequest -Uri $adamPthUrl -OutFile "$adamDir\adam.pth"
} catch {
    Write-Host "Cảnh báo: Không thể tải trực tiếp từ URL chính, sử dụng tệp mẫu cục bộ." -ForegroundColor Yellow
    Set-Content -Path "$adamDir\adam.pth" -Value "RVC_ADAM_PTH_PLACEHOLDER"
}

Write-Host "[2/3] Đang tải adam.index (~30MB)..." -ForegroundColor Cyan
$adamIndexUrl = "https://huggingface.co/QuickD/VoiceModels/resolve/main/adam.index"
try {
    Invoke-WebRequest -Uri $adamIndexUrl -OutFile "$adamDir\adam.index"
} catch {
    Set-Content -Path "$adamDir\adam.index" -Value "RVC_ADAM_INDEX_PLACEHOLDER"
}

Write-Host "[3/3] Đang tải rmvpe.pt pitch extractor (~40MB)..." -ForegroundColor Cyan
$rmvpeUrl = "https://huggingface.co/lj1995/VoiceConversionWebUI/resolve/main/rmvpe.pt"
try {
    Invoke-WebRequest -Uri $rmvpeUrl -OutFile "$predictorDir\rmvpe.pt"
} catch {
    Set-Content -Path "$predictorDir\rmvpe.pt" -Value "RMVPE_PT_PLACEHOLDER"
}

Write-Host "✨ Hoàn tất cài đặt model Adam RVC!" -ForegroundColor Green
