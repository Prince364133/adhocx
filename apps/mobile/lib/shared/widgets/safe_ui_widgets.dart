import 'package:flutter/material.dart';

/// Centralized UI safety widgets to prevent text, row, and layout overflow
/// across all screens in the application.

/// A flex-safe header row that guarantees the title never pushes trailing
/// badges, icons, or actions off screen. The title flexes and truncates
/// with ellipsis when space is constrained.
class SafeHeaderRow extends StatelessWidget {
  final String? title;
  final Widget? titleWidget;
  final TextStyle? titleStyle;
  final Widget? trailing;
  final Widget? leading;
  final double spacing;
  final int maxLines;
  final CrossAxisAlignment crossAxisAlignment;

  const SafeHeaderRow({
    super.key,
    this.title,
    this.titleWidget,
    this.titleStyle,
    this.trailing,
    this.leading,
    this.spacing = 8.0,
    this.maxLines = 1,
    this.crossAxisAlignment = CrossAxisAlignment.center,
  }) : assert(title != null || titleWidget != null);

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: crossAxisAlignment,
      children: [
        if (leading != null) ...[
          leading!,
          SizedBox(width: spacing),
        ],
        Expanded(
          child: titleWidget ??
              Text(
                title ?? '',
                style: titleStyle,
                maxLines: maxLines,
                overflow: TextOverflow.ellipsis,
              ),
        ),
        if (trailing != null) ...[
          SizedBox(width: spacing),
          trailing!,
        ],
      ],
    );
  }
}

/// A flex-safe key-value row (e.g. "Passenger / Requester" -> "Requester Passenger"
/// or "Base Fare" -> "₹800") where both sides flex cleanly without overflow.
class SafeKeyValueRow extends StatelessWidget {
  final String label;
  final String value;
  final TextStyle? labelStyle;
  final TextStyle? valueStyle;
  final Widget? labelWidget;
  final Widget? valueWidget;
  final double spacing;

  const SafeKeyValueRow({
    super.key,
    required this.label,
    required this.value,
    this.labelStyle,
    this.valueStyle,
    this.labelWidget,
    this.valueWidget,
    this.spacing = 12.0,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Flexible(
          child: labelWidget ??
              Text(
                label,
                style: labelStyle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
        ),
        SizedBox(width: spacing),
        Flexible(
          child: valueWidget ??
              Text(
                value,
                style: valueStyle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.end,
              ),
        ),
      ],
    );
  }
}

/// Safe text widget with automatic ellipsis and layout protection
class SafeText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final int maxLines;
  final TextAlign? textAlign;

  const SafeText(
    this.text, {
    super.key,
    this.style,
    this.maxLines = 1,
    this.textAlign,
  });

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: style,
      maxLines: maxLines,
      overflow: TextOverflow.ellipsis,
      textAlign: textAlign,
    );
  }
}
