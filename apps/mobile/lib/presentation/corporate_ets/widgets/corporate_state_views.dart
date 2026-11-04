import 'package:flutter/material.dart';

import '../../../shared/widgets/app_empty_state.dart';
import '../../../shared/widgets/app_error_state.dart';
import '../../../shared/widgets/app_skeleton_loader.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../data/corporate_errors.dart';

/// Full-body loading / empty / error / offline states for corporate ETS screens, built from the
/// shared design-system widgets.
class CorporateStateView extends StatelessWidget {
  const CorporateStateView.loading({super.key})
      : _kind = _Kind.loading,
        error = null,
        onRetry = null,
        emptyTitle = null,
        emptyDescription = null,
        emptyIcon = null,
        emptyActionText = null,
        onEmptyAction = null;

  const CorporateStateView.error({super.key, required CorporateError this.error, required this.onRetry})
      : _kind = _Kind.error,
        emptyTitle = null,
        emptyDescription = null,
        emptyIcon = null,
        emptyActionText = null,
        onEmptyAction = null;

  const CorporateStateView.empty({
    super.key,
    required String this.emptyTitle,
    required String this.emptyDescription,
    this.emptyIcon = Icons.inbox_outlined,
    this.emptyActionText,
    this.onEmptyAction,
  })  : _kind = _Kind.empty,
        error = null,
        onRetry = null;

  final _Kind _kind;
  final CorporateError? error;
  final VoidCallback? onRetry;
  final String? emptyTitle;
  final String? emptyDescription;
  final IconData? emptyIcon;
  final String? emptyActionText;
  final VoidCallback? onEmptyAction;

  @override
  Widget build(BuildContext context) {
    switch (_kind) {
      case _Kind.loading:
        return Padding(
          key: const Key('corporate-loading'),
          padding: AppSpacing.screenPadding,
          child: AppSkeletonLoader.cardList(count: 3),
        );
      case _Kind.empty:
        return AppEmptyState(
          key: const Key('corporate-empty'),
          icon: emptyIcon ?? Icons.inbox_outlined,
          title: emptyTitle!,
          description: emptyDescription!,
          actionText: emptyActionText,
          onAction: onEmptyAction,
        );
      case _Kind.error:
        if (error!.isOffline) {
          return AppEmptyState(
            key: const Key('corporate-offline'),
            icon: Icons.wifi_off_rounded,
            title: 'You are offline',
            description: 'Corporate duties need a connection to the AdhocX server. Reconnect and try again.',
            actionText: 'Retry',
            onAction: onRetry,
          );
        }
        return AppErrorState(
          key: const Key('corporate-error'),
          title: 'Could not load',
          message: error!.message,
          onRetry: onRetry ?? () {},
        );
    }
  }
}

enum _Kind { loading, empty, error }

/// Slim banner shown above already-loaded content when a refresh fails while offline.
class CorporateOfflineBanner extends StatelessWidget {
  const CorporateOfflineBanner({super.key, required this.onRetry, this.message});

  final VoidCallback onRetry;
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('corporate-offline-banner'),
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
      color: AppColors.error,
      child: Row(
        children: [
          const Icon(Icons.wifi_off_rounded, color: Colors.white, size: 18),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              message ?? 'Offline. Showing the last data received from the server.',
              style: AppTypography.caption(color: Colors.white, fontWeight: FontWeight.w600),
              maxLines: 2,
            ),
          ),
          TextButton(
            onPressed: onRetry,
            style: TextButton.styleFrom(
              backgroundColor: Colors.white,
              minimumSize: const Size(64, 36),
              shape: RoundedRectangleBorder(borderRadius: AppRadius.borderXs),
            ),
            child: Text('Retry', style: AppTypography.caption(color: AppColors.error, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

/// Inline error card (used for action failures such as geofence refusals).
class CorporateInlineError extends StatelessWidget {
  const CorporateInlineError({super.key, required this.error, this.title});

  final CorporateError error;
  final String? title;

  @override
  Widget build(BuildContext context) {
    final isGeofence = error.kind == CorporateErrorKind.geofence;
    final color = isGeofence ? AppColors.warning : AppColors.error;
    return Container(
      key: Key(isGeofence ? 'corporate-geofence-error' : 'corporate-inline-error'),
      width: double.infinity,
      padding: AppSpacing.paddingMd,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: AppRadius.borderMd,
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isGeofence ? Icons.location_off_rounded : (error.isOffline ? Icons.wifi_off_rounded : Icons.error_outline),
            color: color,
            size: 20,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title ?? (isGeofence ? 'Not at the pickup point yet' : 'Action failed'),
                  style: AppTypography.body(color: color, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  isGeofence
                      ? '${error.message}\nMove closer to the pickup point (within 150 m) and tap Arrived again.'
                      : error.message,
                  style: AppTypography.small(color: color),
                  overflow: TextOverflow.visible,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Surface color helpers matching the existing driver screens (light and dark).
class CorporateSurface {
  CorporateSurface._();
  static bool isDark(BuildContext c) => Theme.of(c).brightness == Brightness.dark;
  static Color bg(BuildContext c) => isDark(c) ? AppColors.bgDark : AppColors.bgLight;
  static Color card(BuildContext c) => isDark(c) ? AppColors.surfaceDark : AppColors.surfaceLight;
  static Color border(BuildContext c) => isDark(c) ? AppColors.borderDark : AppColors.borderLight;
  static Color text(BuildContext c) => isDark(c) ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
  static Color muted(BuildContext c) => isDark(c) ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
}
