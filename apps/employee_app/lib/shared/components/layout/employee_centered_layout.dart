import 'package:flutter/material.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../../../theme/employee_palette.dart';

/// Full-screen "centred message" layout used by onboarding, permission,
/// verification and status screens:
///
///   [app bar?]
///   ─ flexible space ─
///   illustration
///   title (h2, centred)
///   message (body, secondary, centred)
///   ─ flexible space ─
///   actions (stacked, full width)
///
/// Driver tokens throughout (page background, AppTypography, AppSpacing).
/// The content scrolls when it is taller than the screen (small phones,
/// large accessibility text) instead of overflowing.
class EmployeeCenteredLayout extends StatelessWidget {
  final PreferredSizeWidget? appBar;
  final Widget? illustration;
  final String title;
  final String? message;

  /// Bottom area: buttons/links (stacked with [AppSpacing.md] between them),
  /// or a custom row such as onboarding pagination.
  final List<Widget> actions;

  /// Gap between the illustration and the title.
  final double illustrationGap;

  /// Optional extra block under the message (checklist, progress bar…).
  final Widget? content;

  const EmployeeCenteredLayout({
    super.key,
    this.appBar,
    this.illustration,
    required this.title,
    this.message,
    this.actions = const [],
    this.illustrationGap = AppSpacing.xxxl,
    this.content,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Scaffold(
      backgroundColor: p.background,
      appBar: appBar,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.lg,
            ),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight - AppSpacing.lg * 2,
              ),
              child: IntrinsicHeight(
                child: Column(
                  children: [
                    const Spacer(),
                    if (illustration != null) ...[
                      illustration!,
                      SizedBox(height: illustrationGap),
                    ],
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: AppTypography.h2(
                        color: p.textPrimary,
                        overflow: null,
                      ),
                    ),
                    if (message != null) ...[
                      const SizedBox(height: AppSpacing.md),
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.lg,
                        ),
                        child: Text(
                          message!,
                          textAlign: TextAlign.center,
                          style: AppTypography.body(color: p.textSecondary),
                        ),
                      ),
                    ],
                    if (content != null) ...[
                      const SizedBox(height: AppSpacing.xxxl),
                      content!,
                    ],
                    const Spacer(),
                    const SizedBox(height: AppSpacing.xxl),
                    for (var i = 0; i < actions.length; i++) ...[
                      if (i > 0) const SizedBox(height: AppSpacing.md),
                      actions[i],
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Full-screen loading state: page background + brand spinner.
class EmployeeLoadingScaffold extends StatelessWidget {
  final PreferredSizeWidget? appBar;

  const EmployeeLoadingScaffold({super.key, this.appBar});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return Scaffold(
      backgroundColor: p.background,
      appBar: appBar,
      body: Center(child: CircularProgressIndicator(color: p.accent)),
    );
  }
}

/// Full-width text link used under a primary button ("Not now", "Back to
/// login"). 48dp tall touch target, Driver `label` typography.
class EmployeeTextLink extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;

  /// Use the brand accent (true) or secondary text colour (false).
  final bool emphasised;

  const EmployeeTextLink({
    super.key,
    required this.label,
    required this.onPressed,
    this.emphasised = true,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return SizedBox(
      width: double.infinity,
      height: 48,
      child: TextButton(
        onPressed: onPressed,
        child: Text(
          label,
          style: AppTypography.button(
            color: emphasised ? p.accent : p.textSecondary,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}
