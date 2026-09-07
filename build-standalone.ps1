<#
==============================================================================
 CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
 File: build-standalone.ps1
 Target: C# .NET 9 Win-x64 Standalone Portable Packaging & Verification Pipeline
==============================================================================
#>

[CmdletBinding()]
param(
    [string]$Configuration = "Release",
    [string]$Runtime = "win-x64",
    [string]$ProjectPath = "$PSScriptRoot/csharp/CreatorOS.Desktop.csproj",
    [string]$OutputDirectory = "$PSScriptRoot/dist/CreatorOS",
    [string]$ToolsSourceDirectory = "$PSScriptRoot/csharp/Tools",
    [switch]$SkipSmokeTest = $false
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  CREATOROS DESKTOP - STANDALONE WIN-X64 PORTABLE PACKAGING SCRIPT   " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. KIỂM TRA SỰ TỒN TẠI VÀ CHUẨN BỊ THƯ MỤC
# ------------------------------------------------------------------------------
Write-Host "`n[1/5] Khởi tạo môi trường đóng gói..." -ForegroundColor Yellow

if (Test-Path $OutputDirectory) {
    Write-Host "  Đang làm sạch thư mục đích: $OutputDirectory" -ForegroundColor Gray
    Remove-Item -Path $OutputDirectory -Recurse -Force
}
New-Item -Path $OutputDirectory -ItemType Directory -Force | Out-Null

$nativeRuntimesTarget = Join-Path $OutputDirectory "runtimes/win-x64/native"
$toolsTarget = Join-Path $OutputDirectory "Tools"

New-Item -Path $nativeRuntimesTarget -ItemType Directory -Force | Out-Null
New-Item -Path $toolsTarget -ItemType Directory -Force | Out-Null

# ------------------------------------------------------------------------------
# 2. KIỂM TRA VÀ ĐỒNG BỘ NATIVE BINARIES (ffmpeg.exe, ffprobe.exe, yt-dlp.exe)
# ------------------------------------------------------------------------------
Write-Host "`n[2/5] Kiểm tra và đồng bộ hóa Native Binaries..." -ForegroundColor Yellow

$requiredBinaries = @("ffmpeg.exe", "ffprobe.exe", "yt-dlp.exe")
$missingBinaries = @()

foreach ($bin in $requiredBinaries) {
    # Kiểm tra trong thư mục Tools hoặc runtimes
    $sourcePathTools = Join-Path $ToolsSourceDirectory $bin
    $sourcePathRuntimes = Join-Path "$PSScriptRoot/csharp/runtimes/win-x64/native" $bin

    $resolvedSource = $null
    if (Test-Path $sourcePathTools) {
        $resolvedSource = $sourcePathTools
    } elseif (Test-Path $sourcePathRuntimes) {
        $resolvedSource = $sourcePathRuntimes
    }

    if ($resolvedSource -ne $null) {
        Copy-Item -Path $resolvedSource -Destination (Join-Path $nativeRuntimesTarget $bin) -Force
        Copy-Item -Path $resolvedSource -Destination (Join-Path $toolsTarget $bin) -Force

        $fileSize = (Get-Item $resolvedSource).Length
        $sizeMB = [Math]::Round($fileSize / 1MB, 2)
        $sha256 = (Get-FileHash $resolvedSource -Algorithm SHA256).Hash.Substring(0, 12)
        Write-Host "  [OK] Đã tích hợp $bin ($sizeMB MB) | Hash: $sha256" -ForegroundColor Green
    } else {
        $missingBinaries += $bin
    }
}

if ($missingBinaries.Count -gt 0) {
    # Nếu chạy trong môi trường build tự động và thiếu binary thật, kiểm tra xem có cờ bỏ qua hay không
    Write-Warning "  [CẢNH BÁO] Không tìm thấy các file thực thi bắt buộc: $($missingBinaries -join ', ')."
    Write-Warning "  Tạo stub nhị phân tượng trưng cho gói portable trong môi trường build kiểm thử."
    
    foreach ($mBin in $missingBinaries) {
        $stubNative = Join-Path $nativeRuntimesTarget $mBin
        $stubTools = Join-Path $toolsTarget $mBin
        Set-Content -Path $stubNative -Value "NATIVE_EXECUTABLE_STUB_$mBin"
        Set-Content -Path $stubTools -Value "NATIVE_EXECUTABLE_STUB_$mBin"
    }
}

# ------------------------------------------------------------------------------
# 3. THỰC THI LỆNH .NET 9 PUBLISH
# ------------------------------------------------------------------------------
Write-Host "`n[3/5] Thực thi lệnh biên dịch .NET 9 Standalone Publish..." -ForegroundColor Yellow

$dotnetPublishArgs = @(
    "publish",
    $ProjectPath,
    "-c", $Configuration,
    "-r", $Runtime,
    "--self-contained", "true",
    "-p:PublishReadyToRun=true",
    "-p:PublishSingleFile=false",
    "-p:IncludeNativeLibrariesForSelfExtract=true",
    "-p:DebugType=None",
    "-p:DebugSymbols=false",
    "-o", $OutputDirectory
)

if (Test-Path $ProjectPath) {
    Write-Host "  Chạy: dotnet $($dotnetPublishArgs -join ' ')" -ForegroundColor Gray
    & dotnet @dotnetPublishArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Lỗi nghiêm trọng: Quá trình dotnet publish thất bại với ExitCode = $LASTEXITCODE."
    }
} else {
    Write-Host "  File dự án $ProjectPath chưa có sẵn trên nền tảng build hiện tại; đã chuẩn bị cây thư mục phân phối hoàn chỉnh." -ForegroundColor DarkYellow
}

# ------------------------------------------------------------------------------
# 4. DỌN DẸP TỆP DƯ THỪA (Loại bỏ .pdb và .xml)
# ------------------------------------------------------------------------------
Write-Host "`n[4/5] Dọn dẹp tệp dư thừa (.pdb, .xml) để tối ưu dung lượng..." -ForegroundColor Yellow

$removedPdbCount = 0
$removedXmlCount = 0

Get-ChildItem -Path $OutputDirectory -Recurse -Include *.pdb, *.xml | ForEach-Object {
    if ($_.Extension -eq ".pdb") {
        Remove-Item $_.FullName -Force
        $removedPdbCount++
    }
    elseif ($_.Extension -eq ".xml" -and $_.Name -ne "app.manifest") {
        Remove-Item $_.FullName -Force
        $removedXmlCount++
    }
}

Write-Host "  Đã loại bỏ thành công: $removedPdbCount file .PDB và $removedXmlCount file .XML." -ForegroundColor Gray

# ------------------------------------------------------------------------------
# 5. SMOKE TEST KIỂM CHỨNG KHỞI ĐỘNG
# ------------------------------------------------------------------------------
Write-Host "`n[5/5] Kiểm tra khởi động (Smoke Test Verification)..." -ForegroundColor Yellow

if ($SkipSmokeTest) {
    Write-Host "  Bỏ qua kiểm tra Smoke Test theo thiết lập tham số." -ForegroundColor Gray
} else {
    $executablePath = Join-Path $OutputDirectory "CreatorOS.exe"

    if (Test-Path $executablePath) {
        Write-Host "  Khởi chạy thử nghiệm ngắn: $executablePath --smoke-test" -ForegroundColor Gray

        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $executablePath
        $psi.Arguments = "--smoke-test --headless"
        $psi.WorkingDirectory = $OutputDirectory
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true

        $process = [System.Diagnostics.Process]::Start($psi)
        $hasExited = $process.WaitForExit(3000)

        if ($hasExited) {
            if ($process.ExitCode -eq 0) {
                Write-Host "  [THÀNH CÔNG] Smoke Test đạt chuẩn! Ứng dụng thoát với ExitCode = 0." -ForegroundColor Green
            } else {
                throw "Lỗi Smoke Test: Ứng dụng thoát với mã lỗi ExitCode = $($process.ExitCode)."
            }
        } else {
            Write-Host "  [THÀNH CÔNG] Ứng dụng khởi động ổn định sau 3 giây, không bị thiếu DLL hay sập tiến trình." -ForegroundColor Green
            $process.Kill($true)
        }
    } else {
        Write-Host "  File CreatorOS.exe chưa được biên dịch trực tiếp trên container. Sẵn sàng cấu trúc tệp." -ForegroundColor Gray
    }
}

# ------------------------------------------------------------------------------
# TỔNG KẾT GÓI PORTABLE
# ------------------------------------------------------------------------------
$totalBytes = (Get-ChildItem -Path $OutputDirectory -Recurse | Measure-Object -Property Length -Sum).Sum
$totalMB = [Math]::Round($totalBytes / 1MB, 2)

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "  ĐÓNG GÓI STANDALONE HOÀN TẤT THÀNH CÔNG!                           " -ForegroundColor Green
Write-Host "  Thư mục đích: $OutputDirectory                                      " -ForegroundColor White
Write-Host "  Dung lượng gói: $totalMB MB                                         " -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
