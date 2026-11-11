import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_radius.dart';
import '../../../shared/theme/app_spacing.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_primary_button.dart';

bool _debugForceWebPaymentMode = false;

/// Whether the Vendor/User portal is running in Web Payment Pending mode.
///
/// Always `kIsWeb` in release builds; tests running on the Dart VM may toggle
/// [setDebugForceWebPaymentModeForTesting] to exercise web-only UI branches.
bool get isWebPaymentIntegrationPendingMode =>
    kIsWeb || (!kReleaseMode && _debugForceWebPaymentMode);

@visibleForTesting
void setDebugForceWebPaymentModeForTesting(bool enabled) {
  _debugForceWebPaymentMode = enabled;
}

class PaymentIntegrationPendingSheet extends StatelessWidget {
  const PaymentIntegrationPendingSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      constraints: const BoxConstraints(maxWidth: 540),
      builder: (_) => const PaymentIntegrationPendingSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final textPrimary =
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final textSecondary =
        isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return SafeArea(
      top: false,
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius:
              const BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
          border: Border(
            top: BorderSide(color: borderColor),
            left: BorderSide(color: borderColor),
            right: BorderSide(color: borderColor),
          ),
        ),
        padding: EdgeInsets.only(
          top: AppSpacing.md,
          left: AppSpacing.xl,
          right: AppSpacing.xl,
          bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.xl,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                decoration: BoxDecoration(
                  color: isDark
                      ? AppColors.borderSubtleDark
                      : AppColors.borderSubtleLight,
                  borderRadius: AppRadius.borderPill,
                ),
              ),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.14),
                    borderRadius: AppRadius.borderLg,
                  ),
                  child: const Icon(
                    Icons.payments_outlined,
                    color: AppColors.warning,
                    size: 26,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withValues(alpha: 0.14),
                          borderRadius: AppRadius.borderPill,
                        ),
                        child: Text(
                          'WEB PORTAL NOTICE',
                          style: AppTypography.micro(
                            color: isDark
                                ? AppColors.warning
                                : AppColors.warningText,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Waiting for Payment Integration',
                        maxLines: 2,
                        style: AppTypography.h3(
                          color: textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  tooltip: 'Close',
                  icon: Icon(Icons.close, color: textSecondary),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'We are waiting for payment integration on the AdhocX web portal. Online payments and fleet booking deployment will be available here as soon as payment integration is complete.',
              style: AppTypography.body(color: textSecondary),
            ),
            const SizedBox(height: AppSpacing.md),
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.surfaceElevatedDark
                    : AppColors.surfaceElevatedLight,
                borderRadius: AppRadius.borderLg,
                border: Border.all(color: borderColor),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.info_outline_rounded,
                    size: 18,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'For immediate payments or bookings, please use the AdhocX mobile app or check back shortly.',
                      style: AppTypography.caption(
                        color: textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            AppPrimaryButton(
              text: 'Got It',
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      ),
    );
  }
}

/// Non-wallet placeholder body displayed when a web user lands directly on a
/// payments route instead of tapping the Payments tab.
class WebPaymentIntegrationPendingPlaceholder extends StatelessWidget {
  final String subtitle;
  final VoidCallback? onSecondaryAction;
  final String? secondaryActionLabel;

  const WebPaymentIntegrationPendingPlaceholder({
    super.key,
    this.subtitle =
        'We are waiting for payment integration on the AdhocX web portal. Payment options will appear here once payment integration goes live.',
    this.onSecondaryAction,
    this.secondaryActionLabel,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final textPrimary =
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final textSecondary =
        isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Container(
            padding: const EdgeInsets.all(AppSpacing.xl),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: AppRadius.borderXxl,
              border: Border.all(color: borderColor),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.14),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.payments_outlined,
                    size: 32,
                    color: AppColors.warning,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  'Waiting for Payment Integration',
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  style: AppTypography.h3(
                    color: textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  subtitle,
                  textAlign: TextAlign.center,
                  style: AppTypography.body(color: textSecondary),
                ),
                const SizedBox(height: AppSpacing.xl),
                AppPrimaryButton(
                  text: 'View Payment Status',
                  onPressed: () => PaymentIntegrationPendingSheet.show(context),
                ),
                if (onSecondaryAction != null &&
                    secondaryActionLabel != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  TextButton(
                    onPressed: onSecondaryAction,
                    child: Text(
                      secondaryActionLabel!,
                      style: AppTypography.button(color: AppColors.primary),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Shared web-portal Scaffold used in place of Wallet screens on payment routes.
class WebPaymentIntegrationPendingScaffold extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool showBackButton;
  final String? fallbackHomeRoute;

  const WebPaymentIntegrationPendingScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    this.showBackButton = true,
    this.fallbackHomeRoute,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final router = GoRouter.maybeOf(context);
    final canPop = Navigator.canPop(context);
    final textPrimary =
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;

    VoidCallback? secondaryAction;
    String? secondaryLabel;
    if (canPop) {
      secondaryAction = () => Navigator.pop(context);
      secondaryLabel = 'Go Back';
    } else if (router != null && fallbackHomeRoute != null) {
      secondaryAction = () => router.go(fallbackHomeRoute!);
      secondaryLabel = 'Back to Home';
    }

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        automaticallyImplyLeading: false,
        leading: showBackButton
            ? IconButton(
                onPressed: secondaryAction ??
                    () {
                      if (Navigator.canPop(context)) Navigator.pop(context);
                    },
                icon: Icon(Icons.arrow_back, color: textPrimary),
              )
            : null,
        title: Text(
          title,
          style: AppTypography.h2(
            color: textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SafeArea(
        child: WebPaymentIntegrationPendingPlaceholder(
          subtitle: subtitle,
          onSecondaryAction: secondaryAction,
          secondaryActionLabel: secondaryLabel,
        ),
      ),
    );
  }
}

/// Shared tappable web-portal notice banner replacing Wallet Balance cards on
/// booking screens without exposing wallet UI or top-up actions.
class WebPaymentIntegrationPendingBanner extends StatelessWidget {
  final bool compact;

  const WebPaymentIntegrationPendingBanner({
    super.key,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary =
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final textMuted =
        isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

    return InkWell(
      onTap: () => PaymentIntegrationPendingSheet.show(context),
      borderRadius: BorderRadius.circular(compact ? AppRadius.md : AppRadius.lg),
      child: Container(
        padding: compact
            ? const EdgeInsets.symmetric(horizontal: 10, vertical: 8)
            : const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.warning.withValues(alpha: 0.08),
          borderRadius:
              BorderRadius.circular(compact ? AppRadius.md : AppRadius.lg),
          border: Border.all(
            color: AppColors.warning.withValues(alpha: 0.35),
          ),
        ),
        child: Row(
          children: [
            Icon(
              Icons.payments_outlined,
              size: compact ? 16 : 22,
              color: AppColors.warning,
            ),
            SizedBox(width: compact ? 6 : 10),
            Expanded(
              child: compact
                  ? Text(
                      'Waiting for payment integration',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Waiting for Payment Integration',
                          style: AppTypography.bodyMedium(
                            color: textPrimary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Bookings on the web portal will open once payment integration goes live.',
                          style: AppTypography.caption(color: textMuted),
                        ),
                      ],
                    ),
            ),
            const SizedBox(width: 8),
            const Text(
              'Details',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
