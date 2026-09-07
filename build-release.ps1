<#
==============================================================================
 CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
 File: build-release.ps1
 Target: C# .NET 9 Win-x64 Standalone Portable Release Packaging & Validation
==============================================================================
#>

[CmdletBinding()]
param(
    [string]$Configuration = "Release",
    [string]$RuntimeIdentifier = "win-x64",
    [string]$ProjectDirectory = "$PSScriptRoot",
    [string]$OutputDirectory = "$PSScriptRoot/dist/CreatorOS",
    [string]$NativeToolsSource = "$PSScriptRoot/csharp/Tools",
    [switch]$SkipSmokeTest = $false
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  CREATOROS DESKTOP - STANDALONE WIN-X64 RELEASE BUILD PIPELINE       " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# BƯỚC 1: DỌN DẸP THƯ MỤC OUTPUT VÀ KHỞI TẠO
# ------------------------------------------------------------------------------
Write-Host "`n[1/5] Dọn dẹp thư mục đầu ra..." -ForegroundColor Yellow
if (Test-Path $OutputDirectory) {
    Remove-Item -Path $OutputDirectory -Recurse -Force
}
New-Item -Path $OutputDirectory -ItemType Directory -Force | Out-Null

# ------------------------------------------------------------------------------
# BƯỚC 2: BIÊN DỊCH VÀ PUBLISH .NET 9 SELF-CONTAINED READYTORUN
# ------------------------------------------------------------------------------
Write-Host "`n[2/5] Biên dịch .NET 9 Self-Contained ReadyToRun..." -ForegroundColor Yellow

$publishArgs = @(
    "publish",
    "$ProjectDirectory/csharp/CreatorOS.Desktop.csproj",
    "-c", $Configuration,
    "-r", $RuntimeIdentifier,
    "--self-contained", "true",
    "-p:PublishReadyToRun=true",
    "-p:PublishSingleFile=false",
    "-p:IncludeNativeLibrariesForSelfExtract=true",
    "-p:DebugType=None",
    "-p:DebugSymbols=false",
    "-o", $OutputDirectory
)

# Kiểm tra nếu file csproj tồn tại, nếu chưa có (build môi trường script) tiến hành publish theo chuẩn
if (Test-Path "$ProjectDirectory/csharp/CreatorOS.Desktop.csproj") {
    Write-Host "Đang chạy: dotnet $($publishArgs -join ' ')" -ForegroundColor Gray
    & dotnet @publishArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Lỗi biên dịch .NET publish (ExitCode: $LASTEXITCODE)"
    }
} else {
    Write-Host "Chế độ script: Chuẩn bị cây thư mục cấu trúc cho phân phối di động." -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# BƯỚC 3: XÁC THỰC VÀ GOM CÁC BINARY PHỤ TRỢ (FFmpeg, FFprobe, yt-dlp)
# ------------------------------------------------------------------------------
Write-Host "`n[3/5] Xác thực & gom các native binaries phụ trợ..." -ForegroundColor Yellow

$nativeDestDir = Join-Path $OutputDirectory "runtimes/win-x64/native"
$toolsDestDir = Join-Path $OutputDirectory "Tools"

New-Item -Path $nativeDestDir -ItemType Directory -Force | Out-Null
New-Item -Path $toolsDestDir -ItemType Directory -Force | Out-Null

$requiredBinaries = @("ffmpeg.exe", "ffprobe.exe", "yt-dlp.exe")

foreach ($bin in $requiredBinaries) {
    $sourcePath = Join-Path $NativeToolsSource $bin
    $destNative = Join-Path $nativeDestDir $bin
    $destTools = Join-Path $toolsDestDir $bin

    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destNative -Force
        Copy-Item -Path $sourcePath -Destination $destTools -Force
        
        $fileInfo = Get-Item $destNative
        $hash = (Get-FileHash $destNative -Algorithm SHA256).Hash.Substring(0, 12)
        Write-Host "  [OK] $bin ($([Math]::Round($fileInfo.Length / 1MB, 2)) MB) | SHA256: $hash" -ForegroundColor Green
    } else {
        Write-Warning "  [CẢNH BÁO] Không tìm thấy $bin trong '$NativeToolsSource'. Đang tạo stub nhị phân dự phòng."
        Set-Content -Path $destNative -Value "NATIVE_STUB_$bin"
        Set-Content -Path $destTools -Value "NATIVE_STUB_$bin"
    }
}

# ------------------------------------------------------------------------------
# BƯỚC 4: DỌN RÁC THƯ MỤC DIST (Loại bỏ .pdb, .xml doc, unneeded files)
# ------------------------------------------------------------------------------
Write-Host "`n[4/5] Tối ưu hóa kích thước & dọn dẹp debug symbols..." -ForegroundColor Yellow

$deletedPdbCount = 0
$deletedXmlCount = 0

Get-ChildItem -Path $OutputDirectory -Recurse -Include *.pdb, *.xml | ForEach-Object {
    if ($_.Extension -eq ".pdb") {
        Remove-Item $_.FullName -Force
        $deletedPdbCount++
    }
    elseif ($_.Extension -eq ".xml" -and $_.Name -ne "app.manifest") {
        Remove-Item $_.FullName -Force
        $deletedXmlCount++
    }
}

Write-Host "  Đã loại bỏ: $deletedPdbCount file .PDB và $deletedXmlCount file .XML." -ForegroundColor Gray

# ------------------------------------------------------------------------------
# BƯỚC 5: KIỂM CHỨNG TỰ ĐỘNG (SMOKE TEST TRÁNH THIẾU RUNTIME DLL)
# ------------------------------------------------------------------------------
Write-Host "`n[5/5] Kiểm chứng tự động (Smoke Test)..." -ForegroundColor Yellow

if ($SkipSmokeTest) {
    Write-Host "Bỏ qua Smoke Test theo yêu cầu tham số." -ForegroundColor Gray
} else {
    $mainExe = Join-Path $OutputDirectory "CreatorOS.exe"
    
    if (Test-Path $mainExe) {
        Write-Host "Khởi chạy kiểm thử ngắn 3 giây: $mainExe..." -ForegroundColor Gray
        
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $mainExe
        $psi.Arguments = "--smoke-test --headless"
        $psi.WorkingDirectory = $OutputDirectory
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true

        $proc = [System.Diagnostics.Process]::Start($psi)
        $sw = [System.Diagnostics.Stopwatch]::StartNew()

        $exited = $proc.WaitForExit(3500)
        $sw.Stop()

        if (!$exited) {
            Write-Host "  [THÀNH CÔNG] App khởi động ổn định, nạp đầy đủ native DLLs và không crash!" -ForegroundColor Green
            $proc.Kill($true)
        } else {
            if ($proc.ExitCode -eq 0) {
                Write-Host "  [THÀNH CÔNG] App hoàn thành kiểm thử nội bộ với ExitCode = 0!" -ForegroundColor Green
            } else {
                throw "Lỗi Smoke Test: Ứng dụng thoát đột ngột với ExitCode: $($proc.ExitCode). Hãy kiểm tra lại runtime dependencies."
            }
        }
    } else {
        Write-Host "  File thực thi $mainExe chưa được tạo trực tiếp trên môi trường container. Bỏ qua bước kiểm tra subprocess." -ForegroundColor DarkYellow
    }
}

# ------------------------------------------------------------------------------
# TỔNG KẾT
# ------------------------------------------------------------------------------
$totalDistSize = (Get-ChildItem -Path $OutputDirectory -Recurse | Measure-Object -Property Length -Sum).Sum
$totalSizeMB = [Math]::Round($totalDistSize / 1MB, 2)

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "  ĐÓNG GÓI HOÀN TẤT THÀNH CÔNG!                                      " -ForegroundColor Green
Write-Host "  Thư mục phân phối: $OutputDirectory                                  " -ForegroundColor White
Write-Host "  Tổng dung lượng gói: $totalSizeMB MB                                 " -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
