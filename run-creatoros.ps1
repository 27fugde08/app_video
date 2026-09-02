<#
.SYNOPSIS
    Script Khởi Động & Build Tự Động Toàn Diện cho CreatorOS PRO_V40
.DESCRIPTION
    1. Kiểm tra môi trường .NET 9 SDK, Python và FFmpeg.
    2. Tự động khởi tạo Python Virtual Environment (venv) & cài đặt dependencies.
    3. Build dự án C# .NET 9 WPF.
    4. Khởi chạy ứng dụng CreatorOS PRO_V40 với các biến môi trường được cấu hình sẵn.
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

# Kiểm tra .NET 9 SDK
try {
    $dotnetVersion = (dotnet --version) 2>$null
    if ($dotnetVersion -and $dotnetVersion.StartsWith("9.")) {
        Write-Success ".NET SDK đã sẵn sàng: $dotnetVersion"
    } elseif ($dotnetVersion) {
        Write-Warn "Tìm thấy .NET SDK phiên bản $dotnetVersion (Khuyến nghị .NET 9.0+)."
    } else {
        throw "Không tìm thấy .NET SDK"
    }
} catch {
    Write-Failure "Lỗi: Không tìm thấy .NET 9 SDK trên máy tính!"
    Write-Host " -> Vui lòng cài đặt .NET 9 SDK từ: https://dotnet.microsoft.com/download/dotnet/9.0" -ForegroundColor Gray
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
    Write-Failure "Lỗi: Không tìm thấy Python trên hệ thống!"
    Write-Host " -> Vui lòng cài đặt Python 3.10+ (và tích chọn 'Add python.exe to PATH'): https://www.python.org/downloads/" -ForegroundColor Gray
    Read-Host "`nNhấn phím Enter để thoát..."
    exit 1
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

if (-not (Test-Path $VenvPython)) {
    Write-Step "Đang tạo môi trường ảo Python mới tại '$VenvDir'..."
    python -m venv $VenvDir
    if ($LASTEXITCODE -ne 0) {
        Write-Failure "Không thể tạo Virtual Environment!"
        Read-Host "`nNhấn phím Enter để thoát..."
        exit 1
    }
    Write-Success "Đã tạo thành công Python venv."
} else {
    Write-Success "Môi trường ảo Python đã tồn tại: $VenvPython"
}

# Cập nhật pip và dependencies nếu có requirements.txt
if (Test-Path $RequirementsFile) {
    Write-Step "Đang kiểm tra và cài đặt thư viện Python từ requirements.txt..."
    & $VenvPip install --upgrade pip --quiet
    & $VenvPip install -r $RequirementsFile --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Đã đồng bộ toàn bộ gói phụ thuộc Python thành công."
    } else {
        Write-Warn "Có cảnh báo trong quá trình cài đặt thư viện Python (vui lòng kiểm tra lại logs)."
    }
} else {
    Write-Step "Tạo tệp requirements.txt mẫu cho hệ sinh thái CreatorOS AI..."
    @"
torch
torchaudio
demucs
openai-whisper
yt-dlp
playwright
google-genai
pydantic
"@ | Out-File -FilePath $RequirementsFile -Encoding UTF8
    Write-Success "Đã khởi tạo requirements.txt. Đang cài đặt thư viện cơ bản..."
    & $VenvPip install -r $RequirementsFile --quiet
}

# Đảm bảo Playwright Browsers đã được cài đặt
Write-Step "Kiểm tra trình duyệt Playwright..."
$PlaywrightCli = Join-Path $VenvDir "Scripts\playwright.exe"
if (Test-Path $PlaywrightCli) {
    & $PlaywrightCli install chromium --quiet
}

# =========================================================================
# 3. BIÊN DỊCH DỰ ÁN .NET 9 WPF (BUILD)
# =========================================================================
Write-Header "Biên Dịch Dự Án C# 12 / .NET 9 WPF"

$SolutionFile = Get-ChildItem -Path $ScriptDir -Filter "*.sln" | Select-Object -First 1
$ProjectFile = Get-ChildItem -Path $ScriptDir -Recurse -Filter "*CreatorOS*.csproj" | Select-Object -First 1
$TargetToBuild = if ($SolutionFile) { $SolutionFile.FullName } elseif ($ProjectFile) { $ProjectFile.FullName } else { $null }

$BuildConfiguration = "Debug"
$WpfExecutable = $null

if ($TargetToBuild) {
    Write-Step "Đang biên dịch: $TargetToBuild ($BuildConfiguration Mode)..."
    dotnet build $TargetToBuild -c $BuildConfiguration --nologo -v quiet

    if ($LASTEXITCODE -ne 0) {
        Write-Failure "Biên dịch .NET thất bại! Vui lòng kiểm tra lỗi code trước khi khởi chạy."
        Read-Host "`nNhấn phím Enter để thoát..."
        exit 1
    }
    Write-Success "Biên dịch dự án .NET thành công!"

    # Tìm file thực thi .exe
    $WpfExecutable = (Get-ChildItem -Path (Join-Path $ScriptDir "bin\$BuildConfiguration\net9.0-windows") -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
    if (-not $WpfExecutable) {
        $WpfExecutable = (Get-ChildItem -Path $ScriptDir -Recurse -Filter "*CreatorOS*.exe" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like "*bin\$BuildConfiguration*" } | Select-Object -First 1).FullName
    }
} else {
    Write-Warn "Không tìm thấy file .sln hoặc .csproj ở thư mục gốc. Tìm kiếm file .exe có sẵn..."
    $WpfExecutable = (Get-ChildItem -Path $ScriptDir -Recurse -Filter "*CreatorOS*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
}

# =========================================================================
# 4. KHỞI CHẠY ỨNG DỤNG CREATOROS PRO_V40
# =========================================================================
Write-Header "Khởi Chạy Ứng Dụng CreatorOS PRO_V40"

# Cấu hình biến môi trường toàn cục cho tiến trình
$env:PYTHONUNBUFFERED = "1"
$env:CREATOROS_ENV = "Development"
$env:CREATOROS_PYTHON_PATH = $VenvPython

if ($WpfExecutable -and (Test-Path $WpfExecutable)) {
    Write-Success "Khởi chạy ứng dụng: $WpfExecutable"
    Start-Process -FilePath $WpfExecutable -WorkingDirectory (Split-Path -Parent $WpfExecutable)
    Write-Host "`n✨ Ứng dụng CreatorOS PRO_V40 đang chạy. Bạn có thể đóng cửa sổ này bất cứ lúc nào." -ForegroundColor Green
} else {
    Write-Warn "Không tìm thấy file .exe để tự động khởi chạy. Bạn có thể mở dự án trong Visual Studio / Rider để chạy trực tiếp."
}

Write-Host ""
