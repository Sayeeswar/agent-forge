using System.Globalization;
using System.Windows.Data;

namespace Plainly.Wpf.Converters;

/// <summary>True when both bound int values are equal; used to detect the selected item in a list.</summary>
public sealed class IndexEqualsConverter : IMultiValueConverter
{
    public object Convert(object?[] values, Type targetType, object? parameter, CultureInfo culture) =>
        values is [int a, int b] && a == b;

    public object[] ConvertBack(object? value, Type[] targetTypes, object? parameter, CultureInfo culture) =>
        throw new NotSupportedException();
}
