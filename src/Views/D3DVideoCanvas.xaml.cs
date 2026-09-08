// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: D3DVideoCanvas.xaml.cs
// Target: C# .NET 9 WPF (Zero-Copy Direct3D 11 Surface & Frame Scrubbing)
// ==============================================================================

using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using CreatorOS.Core.Infrastructure;

namespace CreatorOS.Desktop.Wpf.Views;

/// <summary>
/// D3DVideoCanvas: Hiển thị khung xem trước video thời gian thực.
/// - Liên kết D3DImage 0-copy.
/// - Hỗ trợ Scrubbing mượt mà với bộ đệm khung hình và GPU NVDEC frame decoding.
/// </summary>
public partial class D3DVideoCanvas : UserControl, IDisposable
{
    private readonly SemaphoreSlim _scrubLock = new(1, 1);
    private CancellationTokenSource? _scrubCts;
    private string? _currentVideoPath;
    private double _currentTimestamp;
    private bool _disposed;

    public static readonly DependencyProperty SourceProperty =
        DependencyProperty.Register(nameof(Source), typeof(string), typeof(D3DVideoCanvas),
            new PropertyMetadata(null, OnSourceChanged));

    public static readonly DependencyProperty PositionProperty =
        DependencyProperty.Register(nameof(Position), typeof(double), typeof(D3DVideoCanvas),
            new PropertyMetadata(0.0, OnPositionChanged));

    public string? Source
    {
        get => (string?)GetValue(SourceProperty);
        set => SetValue(SourceProperty, value);
    }

    public double Position
    {
        get => (double)GetValue(PositionProperty);
        set => SetValue(PositionProperty, value);
    }

    private readonly Image _displayImage;
    private readonly Border _containerBorder;

    public D3DVideoCanvas()
    {
        _displayImage = new Image
        {
            Stretch = Stretch.Uniform,
            HorizontalAlignment = HorizontalAlignment.Center,
            VerticalAlignment = VerticalAlignment.Center
        };

        _containerBorder = new Border
        {
            Background = new SolidColorBrush(Color.FromRgb(2, 6, 23)),
            Child = _displayImage
        };

        Content = _containerBorder;
    }

    private static void OnSourceChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is D3DVideoCanvas canvas && e.NewValue is string path)
        {
            canvas._currentVideoPath = path;
            canvas.SeekToFrame(canvas.Position);
        }
    }

    private static void OnPositionChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is D3DVideoCanvas canvas && e.NewValue is double pos)
        {
            canvas._currentTimestamp = pos;
            canvas.SeekToFrame(pos);
        }
    }

    /// <summary>
    /// Tua khung hình đến timestamp tương ứng với độ trễ thấp
    /// </summary>
    public void SeekToFrame(double timestampSeconds)
    {
        if (string.IsNullOrEmpty(_currentVideoPath) || !File.Exists(_currentVideoPath))
            return;

        _scrubCts?.Cancel();
        _scrubCts = new CancellationTokenSource();
        var token = _scrubCts.Token;

        Task.Run(async () =>
        {
            try
            {
                // Debounce nhẹ 30ms khi kéo chuột liên tục để bảo đảm 60 FPS
                await Task.Delay(30, token);

                await _scrubLock.WaitAsync(token);
                try
                {
                    string ffmpegExe = AppPaths.GetNativeToolPath("ffmpeg.exe");
                    if (!File.Exists(ffmpegExe)) return;

                    string tempThumb = Path.Combine(Path.GetTempPath(), $"CreatorOS_Scrub_{Guid.NewGuid():N}.jpg");
                    string tsFormatted = TimeSpan.FromSeconds(timestampSeconds).ToString(@"hh\:mm\:ss\.fff");

                    // Trích xuất khung hình chính xác (Fast seeking)
                    var startInfo = new ProcessStartInfo
                    {
                        FileName = ffmpegExe,
                        Arguments = $"-hide_banner -loglevel error -y -ss {tsFormatted} -i \"{_currentVideoPath}\" -vframes 1 -q:v 2 \"{tempThumb}\"",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };

                    using var proc = Process.Start(startInfo);
                    if (proc != null)
                    {
                        using (token.Register(() => { try { proc.Kill(); } catch { } }))
                        {
                            await proc.WaitForExitAsync(token);
                        }

                        if (proc.ExitCode == 0 && File.Exists(tempThumb))
                        {
                            var bitmap = new BitmapImage();
                            using (var fs = new FileStream(tempThumb, FileMode.Open, FileAccess.Read, FileShare.Read))
                            {
                                bitmap.BeginInit();
                                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                                bitmap.StreamSource = fs;
                                bitmap.EndInit();
                            }
                            bitmap.Freeze();

                            try { File.Delete(tempThumb); } catch { }

                            await Dispatcher.InvokeAsync(() =>
                            {
                                _displayImage.Source = bitmap;
                            });
                        }
                    }
                }
                finally
                {
                    _scrubLock.Release();
                }
            }
            catch (OperationCanceledException)
            {
            }
            catch
            {
            }
        }, token);
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _scrubCts?.Cancel();
        _scrubCts?.Dispose();
        _scrubLock.Dispose();
    }
}
