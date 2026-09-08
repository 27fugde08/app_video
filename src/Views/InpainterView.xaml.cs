// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: InpainterView.xaml.cs
// Target: C# .NET 9 WPF (Interactive Mouse Bounding Box Drawer & Direct3D Host)
// ==============================================================================

using System;
using System.Drawing;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Shapes;
using CreatorOS.ViewModels;
using Point = System.Windows.Point;
using Rectangle = System.Drawing.Rectangle;

namespace CreatorOS.Views;

public partial class InpainterView : UserControl
{
    private Point _startPoint;
    private System.Windows.Shapes.Rectangle? _dragRectangle;
    private bool _isDragging;

    public InpainterView()
    {
        InitializeComponent();
    }

    private void OnCanvasMouseDown(object sender, MouseButtonEventArgs e)
    {
        if (e.LeftButton == MouseButtonState.Pressed)
        {
            _startPoint = e.GetPosition(RoiCanvas);
            _isDragging = true;

            // Tạo khung vẽ chữ nhật tạm thời khi rê chuột
            _dragRectangle = new System.Windows.Shapes.Rectangle
            {
                Stroke = new SolidColorBrush(System.Windows.Media.Color.FromArgb(255, 239, 68, 68)),
                StrokeThickness = 2,
                Fill = new SolidColorBrush(System.Windows.Media.Color.FromArgb(60, 239, 68, 68)),
                StrokeDashArray = new DoubleCollection { 2, 2 }
            };

            Canvas.SetLeft(_dragRectangle, _startPoint.X);
            Canvas.SetTop(_dragRectangle, _startPoint.Y);
            RoiCanvas.Children.Add(_dragRectangle);
            RoiCanvas.CaptureMouse();
        }
    }

    private void OnCanvasMouseMove(object sender, MouseEventArgs e)
    {
        if (_isDragging && _dragRectangle != null)
        {
            Point currentPoint = e.GetPosition(RoiCanvas);

            double x = Math.Min(_startPoint.X, currentPoint.X);
            double y = Math.Min(_startPoint.Y, currentPoint.Y);
            double w = Math.Abs(currentPoint.X - _startPoint.X);
            double h = Math.Abs(currentPoint.Y - _startPoint.Y);

            Canvas.SetLeft(_dragRectangle, x);
            Canvas.SetTop(_dragRectangle, y);
            _dragRectangle.Width = w;
            _dragRectangle.Height = h;
        }
    }

    private void OnCanvasMouseUp(object sender, MouseButtonEventArgs e)
    {
        if (_isDragging && _dragRectangle != null)
        {
            _isDragging = false;
            RoiCanvas.ReleaseMouseCapture();

            double x = Canvas.GetLeft(_dragRectangle);
            double y = Canvas.GetTop(_dragRectangle);
            double w = _dragRectangle.Width;
            double h = _dragRectangle.Height;

            RoiCanvas.Children.Remove(_dragRectangle);
            _dragRectangle = null;

            // Thêm vùng chữ nhật vào ViewModel nếu kích thước hợp lệ
            if (w > 15 && h > 10 && DataContext is InpainterViewModel vm)
            {
                vm.AddManualRoiCommand.Execute(new Rectangle((int)x, (int)y, (int)w, (int)h));
            }
        }
    }
}
