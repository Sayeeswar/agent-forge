using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace Plainly.Wpf.Converters;

/// <summary>Visible when the bound string is null/empty; used to show TextBox placeholder text.</summary>
public sealed class EmptyStringToVisibilityConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        string.IsNullOrEmpty(value as string) ? Visibility.Visible : Visibility.Collapsed;

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        throw new NotSupportedException();
}
