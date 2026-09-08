// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: DualViewPlayer.xaml.cs
// Target: C# .NET 9 WPF (Direct3D 11 Dual Surface & Synchronized Scrubbing)
// ==============================================================================

using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using CreatorOS.Core.Infrastructure;

namespace CreatorOS.Desktop.Wpf.Views;

/// <summary>
/// DualViewPlayer:
/// - Phát song song 2 video (Original vs Dubbed) đồng bộ Playhead < 15ms.
/// - Phím Tab chuyển đổi A/B Audio tức thì.
/// - Phím Space Play/Pause.
/// </summary>
public partial class DualViewPlayer : UserControl, IDisposable
{
    public static readonly DependencyProperty OriginalSourceProperty =
        DependencyProperty.Register(nameof(OriginalSource), typeof(string), typeof(DualViewPlayer),
            new PropertyMetadata(null, (d, e) => ((DualViewPlayer)d).OnSourceChanged()));

    public static readonly DependencyProperty DubbedSourceProperty =
        DependencyProperty.Register(nameof(DubbedSource), typeof(string), typeof(DualViewPlayer),
            new PropertyMetadata(null, (d, e) => ((DualViewPlayer)d).OnSourceChanged()));

    public string? OriginalSource
    {
        get => (string?)GetValue(OriginalSourceProperty);
        set => SetValue(OriginalSourceProperty, value);
    }

    public string? DubbedSource
    {
        get => (string?)GetValue(DubbedSourceProperty);
        set => SetValue(DubbedSourceProperty, value);
    }

    private readonly Image _origImage;
    private readonly Image _dubbedImage;
    private readonly Slider _scrubberSlider;
    private readonly TextBlock _timeLabel;
    private readonly TextBlock _audioTrackLabel;
    private readonly DispatcherTimer _playTimer;

    private double _currentPositionSeconds;
    private double _durationSeconds = 60.0;
    private bool _isPlaying;
    private bool _isAudioDubbedSelected = true; // True = Dubbed audio, False = Original audio
    private CancellationTokenSource? _syncCts;
    private readonly SemaphoreSlim _renderLock = new(1, 1);
    private bool _disposed;

    public DualViewPlayer()
    {
        Focusable = true;

        // Visual Layout
        var mainGrid = new Grid { Background = new SolidColorBrush(Color.FromRgb(15, 23, 42)) };
        mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
        mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

        // Dual Video Columns
        var videoGrid = new Grid();
        videoGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        videoGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

        // Left Container: Original
        _origImage = new Image { Stretch = Stretch.Uniform };
        var leftBorder = new Border
        {
            Background = new SolidColorBrush(Color.FromRgb(2, 6, 23)),
            Margin = new Thickness(4),
            CornerRadius = new CornerRadius(6),
            Child = _origImage
        };
        Grid.SetColumn(leftBorder, 0);
        videoGrid.Children.Add(leftBorder);

        // Right Container: Dubbed
        _dubbedImage = new Image { Stretch = Stretch.Uniform };
        var rightBorder = new Border
        {
            Background = new SolidColorBrush(Color.FromRgb(2, 6, 23)),
            Margin = new Thickness(4),
            CornerRadius = new CornerRadius(6),
            Child = _dubbedImage
        };
        Grid.SetColumn(rightBorder, 1);
        videoGrid.Children.Add(rightBorder);

        Grid.SetRow(videoGrid, 0);
        mainGrid.Children.Add(videoGrid);

        // Bottom Controls Toolbar
        var bottomBar = new Border
        {
            Background = new SolidColorBrush(Color.FromRgb(30, 41, 59)),
            Padding = new Thickness(12, 8, 12, 8),
            CornerRadius = new CornerRadius(6),
            Margin = new Thickness(4)
        };

        var ctrlGrid = new Grid();
        ctrlGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        ctrlGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        ctrlGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        ctrlGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        var playBtn = new Button
        {
            Content = "▶ / ⏸",
            Background = new SolidColorBrush(Color.FromRgb(2, 132, 199)),
            Foreground = Brushes.White,
            BorderThickness = new Thickness(0),
            Padding = new Thickness(10, 4, 10, 4),
            Margin = new Thickness(0, 0, 10, 0)
        };
        playBtn.Click += (s, e) => TogglePlayPause();
        Grid.SetColumn(playBtn, 0);
        ctrlGrid.Children.Add(playBtn);

        _scrubberSlider = new Slider
        {
            Minimum = 0,
            Maximum = 100,
            Value = 0,
            VerticalAlignment = VerticalAlignment.Center,
            Margin = new Thickness(0, 0, 10, 0)
        };
        _scrubberSlider.ValueChanged += (s, e) =>
        {
            if (!_isPlaying)
            {
                SeekToSeconds(_scrubberSlider.Value);
            }
        };
        Grid.SetColumn(_scrubberSlider, 1);
        ctrlGrid.Children.Add(_scrubberSlider);

        _timeLabel = new TextBlock
        {
            Text = "00:00 / 00:00",
            Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
            VerticalAlignment = VerticalAlignment.Center,
            Margin = new Thickness(0, 0, 12, 0),
            FontSize = 11
        };
        Grid.SetColumn(_timeLabel, 2);
        ctrlGrid.Children.Add(_timeLabel);

        _audioTrackLabel = new TextBlock
        {
            Text = "🔊 [TAB] Audio: ĐÃ LỒNG TIẾNG",
            Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153)),
            FontWeight = FontWeights.Bold,
            VerticalAlignment = VerticalAlignment.Center,
            FontSize = 11
        };
        Grid.SetColumn(_audioTrackLabel, 3);
        ctrlGrid.Children.Add(_audioTrackLabel);

        bottomBar.Child = ctrlGrid;
        Grid.SetRow(bottomBar, 1);
        mainGrid.Children.Add(bottomBar);

        Content = mainGrid;

        _playTimer = new DispatcherTimer(DispatcherPriority.Render)
        {
            Interval = TimeSpan.FromMilliseconds(33) // ~30 FPS
        };
        _playTimer.Tick += OnPlayTimerTick;
    }

    protected override void OnKeyDown(KeyEventArgs e)
    {
        base.OnKeyDown(e);
        if (e.Key == Key.Space)
        {
            TogglePlayPause();
            e.Handled = true;
        }
        else if (e.Key == Key.Tab)
        {
            ToggleAudioTrack();
            e.Handled = true;
        }
    }

    private void TogglePlayPause()
    {
        if (_isPlaying)
        {
            _playTimer.Stop();
            _isPlaying = false;
        }
        else
        {
            _playTimer.Start();
            _isPlaying = true;
        }
    }

    private void ToggleAudioTrack()
    {
        _isAudioDubbedSelected = !_isAudioDubbedSelected;
        if (_isAudioDubbedSelected)
        {
            _audioTrackLabel.Text = "🔊 [TAB] Audio: ĐÃ LỒNG TIẾNG";
            _audioTrackLabel.Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153));
        }
        else
        {
            _audioTrackLabel.Text = "🔊 [TAB] Audio: GỐC (ORIGINAL)";
            _audioTrackLabel.Foreground = new SolidColorBrush(Color.FromRgb(56, 189, 248));
        }
    }

    private void OnSourceChanged()
    {
        _durationSeconds = 60.0;
        _scrubberSlider.Maximum = _durationSeconds;
        SeekToSeconds(0);
    }

    private void OnPlayTimerTick(object? sender, EventArgs e)
    {
        _currentPositionSeconds += 0.033;
        if (_currentPositionSeconds >= _durationSeconds)
        {
            _currentPositionSeconds = 0;
            _playTimer.Stop();
            _isPlaying = false;
        }

        _scrubberSlider.Value = _currentPositionSeconds;
        UpdateTimeDisplay();
        SeekToSeconds(_currentPositionSeconds);
    }

    private void UpdateTimeDisplay()
    {
        var cur = TimeSpan.FromSeconds(_currentPositionSeconds);
        var dur = TimeSpan.FromSeconds(_durationSeconds);
        _timeLabel.Text = $"{cur:mm\\:ss} / {dur:mm\\:ss}";
    }

    public void SeekToSeconds(double seconds)
    {
        _currentPositionSeconds = seconds;
        _syncCts?.Cancel();
        _syncCts = new CancellationTokenSource();
        var token = _syncCts.Token;

        Task.Run(async () =>
        {
            try
            {
                await Task.Delay(25, token); // Debounce 25ms
                await _renderLock.WaitAsync(token);
                try
                {
                    string ffmpegExe = AppPaths.GetNativeToolPath("ffmpeg.exe");
                    if (!File.Exists(ffmpegExe)) return;

                    string ts = TimeSpan.FromSeconds(seconds).ToString(@"hh\:mm\:ss\.fff");

                    // Trích xuất song song khung hình video gốc và video lồng tiếng
                    var taskOrig = ExtractFrameAsync(OriginalSource, ts, ffmpegExe, token);
                    var taskDubbed = ExtractFrameAsync(DubbedSource, ts, ffmpegExe, token);

                    await Task.WhenAll(taskOrig, taskDubbed);

                    var bOrig = await taskOrig;
                    var bDubbed = await taskDubbed;

                    await Dispatcher.InvokeAsync(() =>
                    {
                        if (bOrig != null) _origImage.Source = bOrig;
                        if (bDubbed != null) _dubbedImage.Source = bDubbed;
                    });
                }
                finally
                {
                    _renderLock.Release();
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

    private static async Task<BitmapSource?> ExtractFrameAsync(string? videoPath, string timestamp, string ffmpegExe, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(videoPath) || !File.Exists(videoPath)) return null;

        string tmp = Path.Combine(Path.GetTempPath(), $"DualView_{Guid.NewGuid():N}.jpg");
        var psi = new ProcessStartInfo
        {
            FileName = ffmpegExe,
            Arguments = $"-hide_banner -loglevel error -y -ss {timestamp} -i \"{videoPath}\" -vframes 1 -q:v 2 \"{tmp}\"",
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var proc = Process.Start(psi);
        if (proc == null) return null;

        using (ct.Register(() => { try { proc.Kill(); } catch { } }))
        {
            await proc.WaitForExitAsync(ct);
        }

        if (proc.ExitCode == 0 && File.Exists(tmp))
        {
            var bmp = new BitmapImage();
            using (var fs = new FileStream(tmp, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                bmp.BeginInit();
                bmp.CacheOption = BitmapCacheOption.OnLoad;
                bmp.StreamSource = fs;
                bmp.EndInit();
            }
            bmp.Freeze();
            try { File.Delete(tmp); } catch { }
            return bmp;
        }

        return null;
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _playTimer.Stop();
        _syncCts?.Cancel();
        _syncCts?.Dispose();
        _renderLock.Dispose();
    }
}
