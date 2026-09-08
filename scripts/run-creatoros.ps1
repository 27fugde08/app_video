<#
.SYNOPSIS
    Script Khởi Động & Build Tự Động Toàn Diện cho CreatorOS PRO_V40
.DESCRIPTION
    1. Kiểm tra môi trường .NET, Node.js, Python và FFmpeg.
    2. Tự động khởi tạo Python Virtual Environment (venv) & cài đặt dependencies.
    3. Đồng bộ hóa các gói phụ thuộc Node.js (Frontend & Backend).
    4. Khởi chạy toàn bộ hệ thống CreatorOS (Backend Daemon + Frontend / Desktop).
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "CreatorOS PRO_V40 - Unified Launch & Build Environment"

# Định nghĩa màu sắc và hàm in thông báo
function Write-Header {
    param([string]$Message)
    Write-Host "`n================================================================" -ForegroundColor Cyan
    Write-Host " 🚀 $Message" -ForegroundColor Cyan -NoNewline
    Write-Host "`n================================================================" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Message)
    Write-Host " [>>] $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host " [OK] $Message" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Message)
    Write-Host " [ERR] $Message" -ForegroundColor Red
}

function Write-Warn {
    param([string]$Message)
    Write-Host " [!] $Message" -ForegroundColor Magenta
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Header "CreatorOS PRO_V40 - Automated Build & Launch System"

# =========================================================================
# 1. KIỂM TRA MÔI TRƯỜNG HỆ THỐNG
# =========================================================================
Write-Step "Kiểm tra các công cụ môi trường cần thiết..."

# Kiểm tra Node.js
try {
    $nodeVersion = (node --version 2>&1)
    if ($nodeVersion -and $nodeVersion.StartsWith("v")) {
        Write-Success "Node.js đã sẵn sàng: $nodeVersion"
    } else {
        throw "Không tìm thấy Node.js"
    }
} catch {
    Write-Failure "Lỗi: Không tìm thấy Node.js trên máy tính!"
    Write-Host " -> Vui lòng cài đặt Node.js LTS từ: https://nodejs.org/" -ForegroundColor Gray
    Read-Host "`nNhấn phím Enter để thoát..."
    exit 1
}

# Kiểm tra Python
try {
    $pythonCmd = (Get-Command python -ErrorAction SilentlyContinue).Source
    if (-not $pythonCmd) {
        $pythonCmd = (Get-Command py -ErrorAction SilentlyContinue).Source
    }

    if ($pythonCmd) {
        $pyVersion = (& python --version 2>&1)
        Write-Success "Python đã sẵn sàng: $pyVersion ($pythonCmd)"
    } else {
        throw "Không tìm thấy Python"
    }
} catch {
    Write-Warn "Chưa tìm thấy Python trên PATH. Các tính năng AI có thể bị hạn chế."
    Write-Host " -> Bạn có thể cài đặt Python 3.10+ từ: https://www.python.org/downloads/" -ForegroundColor Gray
}

# Kiểm tra .NET SDK (Tùy chọn)
try {
    $dotnetVersion = (dotnet --version 2>$null)
    if ($dotnetVersion) {
        Write-Success ".NET SDK đã sẵn sàng: $dotnetVersion"
    }
} catch {
    Write-Warn "Chưa cài đặt .NET SDK (chỉ cần thiết nếu biên dịch mã nguồn C# cục bộ)."
}

# Kiểm tra FFmpeg
$ffmpegLocal = Join-Path $ScriptDir "bin\ffmpeg.exe"
$ffmpegInPath = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source

if (Test-Path $ffmpegLocal) {
    Write-Success "Tìm thấy FFmpeg tích hợp sẵn: $ffmpegLocal"
    $env:PATH = "$(Join-Path $ScriptDir 'bin');" + $env:PATH
} elseif ($ffmpegInPath) {
    Write-Success "Tìm thấy FFmpeg từ hệ thống PATH: $ffmpegInPath"
} else {
    Write-Warn "Cảnh báo: Chưa tìm thấy FFmpeg. Bạn có thể tải FFmpeg và đặt file ffmpeg.exe vào thư mục 'bin\'."
}

# =========================================================================
# 2. KHỞI TẠO & CẬP NHẬT PYTHON VIRTUAL ENVIRONMENT (VENV)
# =========================================================================
Write-Header "Quản Lý Môi Trường Ảo Python (Virtual Environment)"

$VenvDir = Join-Path $ScriptDir "py_env"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$VenvPip = Join-Path $VenvDir "Scripts\pip.exe"
$RequirementsFile = Join-Path $ScriptDir "requirements.txt"

if ((Get-Command python -ErrorAction SilentlyContinue)) {
    if (-not (Test-Path $VenvPython)) {
        Write-Step "Đang tạo môi trường ảo Python mới tại '$VenvDir'..."
        python -m venv $VenvDir
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Đã tạo thành công Python venv."
        } else {
            Write-Warn "Không thể tạo Virtual Environment. Tiếp tục với Python mặc định."
        }
    } else {
        Write-Success "Môi trường ảo Python đã tồn tại: $VenvPython"
    }

    # Cập nhật pip và dependencies nếu có requirements.txt
    if (Test-Path $RequirementsFile) {
        Write-Step "Đang kiểm tra và cài đặt thư viện Python từ requirements.txt..."
        if (Test-Path $VenvPip) {
            & $VenvPip install --upgrade pip --quiet
            & $VenvPip install -r $RequirementsFile --quiet
        }
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Đã đồng bộ toàn bộ gói phụ thuộc Python thành công."
        } else {
            Write-Warn "Có cảnh báo trong quá trình cài đặt thư viện Python."
        }
    } else {
        Write-Step "Tạo tệp requirements.txt mẫu cho hệ sinh thái CreatorOS AI..."
        $defaultRequirements = @(
            "torch",
            "torchaudio",
            "demucs",
            "openai-whisper",
            "yt-dlp",
            "playwright",
            "google-genai",
            "pydantic"
        )
        $defaultRequirements | Out-File -FilePath $RequirementsFile -Encoding UTF8
        Write-Success "Đã khởi tạo requirements.txt."
        if (Test-Path $VenvPip) {
            & $VenvPip install -r $RequirementsFile --quiet
        }
    }

    # Kiểm tra Playwright Browsers
    $PlaywrightCli = Join-Path $VenvDir "Scripts\playwright.exe"
    if (Test-Path $PlaywrightCli) {
        Write-Step "Kiểm tra trình duyệt Playwright..."
        & $PlaywrightCli install chromium --quiet
    }
}

# =========================================================================
# 3. KIỂM TRA & CÀI ĐẶT NODE.JS DEPENDENCIES
# =========================================================================
Write-Header "Cấu Hình Phụ Thuộc Node.js (Frontend & Backend)"

$RootNodeModules = Join-Path $ScriptDir "node_modules"
$BackendNodeModules = Join-Path $ScriptDir "backend\node_modules"

if (-not (Test-Path $RootNodeModules)) {
    Write-Step "Đang cài đặt dependencies cho Frontend (npm install)..."
    npm install
} else {
    Write-Success "Phụ thuộc Frontend đã sẵn sàng."
}

if (-not (Test-Path $BackendNodeModules)) {
    Write-Step "Đang cài đặt dependencies cho Backend Daemon (npm install)..."
    Push-Location (Join-Path $ScriptDir "backend")
    npm install
    Pop-Location
} else {
    Write-Success "Phụ thuộc Backend Daemon đã sẵn sàng."
}

# =========================================================================
# 4. BIÊN DỊCH DỰ ÁN .NET NẾU CÓ
# =========================================================================
$SolutionFile = Get-ChildItem -Path $ScriptDir -Filter "*.sln" | Select-Object -First 1
$ProjectFile = Get-ChildItem -Path $ScriptDir -Recurse -Filter "*CreatorOS*.csproj" | Select-Object -First 1
$TargetToBuild = if ($SolutionFile) { $SolutionFile.FullName } elseif ($ProjectFile) { $ProjectFile.FullName } else { $null }

$BuildConfiguration = "Debug"
$WpfExecutable = $null

if ($TargetToBuild) {
    Write-Header "Biên Dịch Dự Án C# 12 / .NET 9 WPF"
    Write-Step "Đang biên dịch: $TargetToBuild ($BuildConfiguration Mode)..."
    dotnet build $TargetToBuild -c $BuildConfiguration --nologo -v quiet

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Biên dịch dự án .NET thành công!"
        $WpfExecutable = (Get-ChildItem -Path (Join-Path $ScriptDir "bin\$BuildConfiguration\net9.0-windows") -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
        if (-not $WpfExecutable) {
            $WpfExecutable = (Get-ChildItem -Path $ScriptDir -Recurse -Filter "*CreatorOS*.exe" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like "*bin\$BuildConfiguration*" } | Select-Object -First 1).FullName
        }
    }
}

# =========================================================================
# 5. KHỞI CHẠY HỆ THỐNG CREATOROS PRO_V40
# =========================================================================
Write-Header "Khởi Chạy Ứng Dụng CreatorOS PRO_V40"

# Cấu hình biến môi trường toàn cục cho tiến trình
$env:PYTHONUNBUFFERED = "1"
$env:CREATOROS_ENV = "Development"
if (Test-Path $VenvPython) {
    $env:CREATOROS_PYTHON_PATH = $VenvPython
}

if ($WpfExecutable -and (Test-Path $WpfExecutable)) {
    Write-Success "Khởi chạy giao diện WPF Desktop: $WpfExecutable"
    Start-Process -FilePath $WpfExecutable -WorkingDirectory (Split-Path -Parent $WpfExecutable)
    Write-Host "`n✨ Ứng dụng CreatorOS PRO_V40 đang chạy." -ForegroundColor Green
} else {
    Write-Step "Đang khởi động Backend Daemon (Cổng 5000)..."
    Start-Process -FilePath "node" -ArgumentList "src/server.js" -WorkingDirectory (Join-Path $ScriptDir "backend") -WindowStyle Hidden

    Write-Step "Đang khởi động Frontend Vite Dev Server (Cổng 3000)..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $ScriptDir -WindowStyle Hidden

    Start-Sleep -Seconds 2
    Write-Success "Backend Daemon đang chạy tại: http://localhost:5000"
    Write-Success "Giao diện Frontend sẵn sàng tại: http://localhost:3000"

    # Tự động mở trình duyệt đến giao diện ứng dụng
    Start-Process "http://localhost:3000"

    Write-Host "`n✨ Hệ thống CreatorOS PRO_V40 đã khởi chạy thành công!" -ForegroundColor Green
    Write-Host " 🌐 Truy cập: http://localhost:3000" -ForegroundColor Cyan
}

Write-Host ""

