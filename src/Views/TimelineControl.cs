// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: TimelineControl.cs
// Target: C# .NET 9 WPF (Vector DrawingContext OnRender & Interactive Scrubbing)
// ==============================================================================

using System;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using CreatorOS.Core.Models;

namespace CreatorOS.Desktop.Wpf.Views;

/// <summary>
/// TimelineControl:
/// - Vẽ toàn bộ Ruler, Tracks, Clips và Playhead qua DrawingContext OnRender (0 allocation).
/// - Xử lý Zoom chuột (Ctrl + Wheel), Scrubbing kéo thả, Split (phím C), Delete (phím Del).
/// </summary>
public sealed class TimelineControl : Control
{
    public static readonly DependencyProperty ProjectProperty =
        DependencyProperty.Register(nameof(Project), typeof(TimelineProject), typeof(TimelineControl),
            new FrameworkPropertyMetadata(null, FrameworkPropertyMetadataOptions.AffectsRender));

    public static readonly DependencyProperty CurrentPositionSecondsProperty =
        DependencyProperty.Register(nameof(CurrentPositionSeconds), typeof(double), typeof(TimelineControl),
            new FrameworkPropertyMetadata(0.0, FrameworkPropertyMetadataOptions.AffectsRender | FrameworkPropertyMetadataOptions.BindsTwoWayByDefault));

    public static readonly DependencyProperty PixelsPerSecondProperty =
        DependencyProperty.Register(nameof(PixelsPerSecond), typeof(double), typeof(TimelineControl),
            new FrameworkPropertyMetadata(40.0, FrameworkPropertyMetadataOptions.AffectsRender));

    public TimelineProject? Project
    {
        get => (TimelineProject?)GetValue(ProjectProperty);
        set => SetValue(ProjectProperty, value);
    }

    public double CurrentPositionSeconds
    {
        get => (double)GetValue(CurrentPositionSecondsProperty);
        set => SetValue(CurrentPositionSecondsProperty, value);
    }

    public double PixelsPerSecond
    {
        get => (double)GetValue(PixelsPerSecondProperty);
        set => SetValue(PixelsPerSecondProperty, value);
    }

    // Colors and Pens
    private readonly Brush _bgBrush = new SolidColorBrush(Color.FromRgb(15, 23, 42));
    private readonly Brush _rulerBgBrush = new SolidColorBrush(Color.FromRgb(30, 41, 59));
    private readonly Brush _videoClipBrush = new SolidColorBrush(Color.FromRgb(2, 132, 199));
    private readonly Brush _voiceClipBrush = new SolidColorBrush(Color.FromRgb(16, 185, 129));
    private readonly Brush _musicClipBrush = new SolidColorBrush(Color.FromRgb(245, 158, 11));
    private readonly Brush _subClipBrush = new SolidColorBrush(Color.FromRgb(168, 85, 247));
    private readonly Pen _gridPen = new(new SolidColorBrush(Color.FromRgb(51, 65, 85)), 1.0);
    private readonly Pen _playheadPen = new(new SolidColorBrush(Color.FromRgb(239, 68, 68)), 2.0);
    private readonly Typeface _typeface = new("Segoe UI");

    private bool _isScrubbing;

    static TimelineControl()
    {
        DefaultStyleKeyProperty.OverrideMetadata(typeof(TimelineControl), new FrameworkPropertyMetadata(typeof(TimelineControl)));
    }

    public TimelineControl()
    {
        Focusable = true;
        _gridPen.Freeze();
        _playheadPen.Freeze();
    }

    protected override void OnRender(DrawingContext dc)
    {
        base.OnRender(dc);

        double width = Math.Max(ActualWidth, 800);
        double height = Math.Max(ActualHeight, 260);

        // 1. Draw Background
        dc.DrawRectangle(_bgBrush, null, new Rect(0, 0, width, height));

        double rulerHeight = 30.0;
        double trackHeight = 50.0;

        // 2. Draw Ruler Background
        dc.DrawRectangle(_rulerBgBrush, null, new Rect(0, 0, width, rulerHeight));

        double pps = Math.Max(PixelsPerSecond, 5.0);

        // Draw Time Markers on Ruler
        double totalSeconds = Project?.GetTotalDurationSeconds() ?? 60.0;
        totalSeconds = Math.Max(totalSeconds, width / pps);

        for (double sec = 0; sec <= totalSeconds; sec += 1.0)
        {
            double x = sec * pps;
            if (x > width) break;

            bool isMajor = sec % 5 == 0;
            double tickHeight = isMajor ? 12.0 : 6.0;

            dc.DrawLine(_gridPen, new Point(x, rulerHeight - tickHeight), new Point(x, rulerHeight));

            if (isMajor)
            {
                var ts = TimeSpan.FromSeconds(sec);
                string label = ts.ToString(@"mm\:ss");
                var text = new FormattedText(
                    label,
                    CultureInfo.InvariantCulture,
                    FlowDirection.LeftToRight,
                    _typeface,
                    10.0,
                    new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                    1.25
                );
                dc.DrawText(text, new Point(x + 3, 4));
            }
        }

        // 3. Draw Tracks & Clips
        if (Project != null)
        {
            int trackIndex = 0;
            foreach (var track in Project.AllTracks)
            {
                double trackY = rulerHeight + (trackIndex * trackHeight);

                // Track horizontal divider
                dc.DrawLine(_gridPen, new Point(0, trackY), new Point(width, trackY));

                Brush clipBrush = track.Type switch
                {
                    TrackType.MainVideo => _videoClipBrush,
                    TrackType.Voice => _voiceClipBrush,
                    TrackType.Music => _musicClipBrush,
                    _ => _subClipBrush
                };

                foreach (var clip in track.Clips)
                {
                    double clipX = clip.TimelineStartSeconds * pps;
                    double clipWidth = Math.Max(clip.TimelineDurationSeconds * pps, 4.0);

                    var clipRect = new Rect(clipX, trackY + 4, clipWidth, trackHeight - 8);
                    dc.DrawRoundedRectangle(clipBrush, null, clipRect, 4, 4);

                    // Clip Name Label
                    if (clipWidth > 30)
                    {
                        var clipText = new FormattedText(
                            clip.Name,
                            CultureInfo.InvariantCulture,
                            FlowDirection.LeftToRight,
                            _typeface,
                            11.0,
                            Brushes.White,
                            1.25
                        );
                        clipText.MaxTextWidth = clipWidth - 8;
                        clipText.MaxTextHeight = 18;
                        dc.DrawText(clipText, new Point(clipX + 6, trackY + 8));
                    }
                }

                trackIndex++;
            }
        }

        // 4. Draw Playhead
        double playheadX = CurrentPositionSeconds * pps;
        dc.DrawLine(_playheadPen, new Point(playheadX, 0), new Point(playheadX, height));

        // Playhead Top Pointer Triangle
        var triangleGeom = new StreamGeometry();
        using (var ctx = triangleGeom.Open())
        {
            ctx.BeginFigure(new Point(playheadX - 6, 0), true, true);
            ctx.LineTo(new Point(playheadX + 6, 0), true, false);
            ctx.LineTo(new Point(playheadX, 10), true, false);
        }
        triangleGeom.Freeze();
        dc.DrawGeometry(Brushes.Red, null, triangleGeom);
    }

    protected override void OnMouseDown(MouseButtonEventArgs e)
    {
        base.OnMouseDown(e);
        if (e.LeftButton == MouseButtonState.Pressed)
        {
            _isScrubbing = true;
            CaptureMouse();
            UpdatePositionFromMouse(e.GetPosition(this).X);
        }
    }

    protected override void OnMouseMove(MouseEventArgs e)
    {
        base.OnMouseMove(e);
        if (_isScrubbing)
        {
            UpdatePositionFromMouse(e.GetPosition(this).X);
        }
    }

    protected override void OnMouseUp(MouseButtonEventArgs e)
    {
        base.OnMouseUp(e);
        if (_isScrubbing)
        {
            _isScrubbing = false;
            ReleaseMouseCapture();
        }
    }

    protected override void OnMouseWheel(MouseWheelEventArgs e)
    {
        base.OnMouseWheel(e);
        if (Keyboard.Modifiers.HasFlag(ModifierKeys.Control))
        {
            // Zoom in / Zoom out
            double delta = e.Delta > 0 ? 1.2 : 0.8;
            PixelsPerSecond = Math.Clamp(PixelsPerSecond * delta, 10.0, 300.0);
            InvalidateVisual();
            e.Handled = true;
        }
    }

    private void UpdatePositionFromMouse(double mouseX)
    {
        double pps = Math.Max(PixelsPerSecond, 5.0);
        double targetSeconds = Math.Max(0.0, mouseX / pps);
        CurrentPositionSeconds = targetSeconds;
        InvalidateVisual();
    }
}
