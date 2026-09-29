using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace Plainly.Wpf.Converters;

/// <summary>
/// Turns a 0-100 percent value into a star-sized GridLength, so a progress
/// bar can be built as two Grid columns without a fixed pixel width.
/// Pass ConverterParameter="inverse" for the remainder (100 - percent).
/// </summary>
public sealed class PercentToGridLengthConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var percent = value is int i ? i : 0;
        percent = Math.Clamp(percent, 0, 100);
        var isInverse = string.Equals(parameter as string, "inverse", StringComparison.OrdinalIgnoreCase);
        return new GridLength(isInverse ? 100 - percent : percent, GridUnitType.Star);
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        throw new NotSupportedException();
}
