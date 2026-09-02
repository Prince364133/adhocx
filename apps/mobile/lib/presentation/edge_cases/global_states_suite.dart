import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

/// 1. No Internet State Widget
class NoInternetWidget extends StatelessWidget {
  final VoidCallback? onRetry;
  const NoInternetWidget({super.key, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.error),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'No Internet Connection',
            style: AppTypography.h2(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'Please check your Wi-Fi or mobile data connection and try again.',
            style: AppTypography.body(color: AppColors.textSecondaryLight),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppPrimaryButton(
            text: 'RETRY CONNECTION',
            onPressed: onRetry ?? () => Fluttertoast.showToast(msg: 'Retrying network connection...'),
          ),
        ],
      ),
    );
  }
}

/// 2. Server Error (500/503) State Widget
class ServerErrorWidget extends StatelessWidget {
  const ServerErrorWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: const Color(0xFFea580c).withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.dns_outlined, size: 48, color: Color(0xFFea580c)),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Server Error (500)',
            style: AppTypography.h2(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'Our servers are experiencing technical difficulties. Please try again in a few moments.',
            style: AppTypography.body(color: AppColors.textSecondaryLight),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppPrimaryButton(
            text: 'TRY AGAIN',
            onPressed: () => Fluttertoast.showToast(msg: 'Reconnecting to server...'),
          ),
        ],
      ),
    );
  }
}

/// 3. Something Went Wrong (Generic Error) State Widget
class SomethingWentWrongWidget extends StatelessWidget {
  const SomethingWentWrongWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.warning_amber_rounded, size: 48, color: AppColors.primary),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Something Went Wrong',
            style: AppTypography.h2(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'An unexpected error occurred. Don\'t worry, your data is safe.',
            style: AppTypography.body(color: AppColors.textSecondaryLight),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppPrimaryButton(
            text: 'REFRESH PAGE',
            onPressed: () => Fluttertoast.showToast(msg: 'Refreshing application...'),
          ),
        ],
      ),
    );
  }
}

/// 4. Session Expired State Widget
class SessionExpiredWidget extends StatelessWidget {
  const SessionExpiredWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.lock_clock_outlined, size: 48, color: AppColors.error),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Session Expired',
            style: AppTypography.h2(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'Your session has ended for security. Please sign in again to access driver features.',
            style: AppTypography.body(color: AppColors.textSecondaryLight),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppPrimaryButton(
            text: 'SIGN IN AGAIN',
            onPressed: () => context.go(AppRoutes.signInScreen),
          ),
        ],
      ),
    );
  }
}

/// 5. Permission Required State Widget
class PermissionRequiredWidget extends StatelessWidget {
  const PermissionRequiredWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.security_rounded, size: 48, color: AppColors.primary),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'System Permission Required',
            style: AppTypography.h2(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'AdhocX requires device permissions to provide driver dispatch and safety services.',
            style: AppTypography.body(color: AppColors.textSecondaryLight),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppPrimaryButton(
            text: 'GRANT PERMISSIONS',
            onPressed: () => Fluttertoast.showToast(msg: 'System permissions granted!'),
          ),
        ],
      ),
    );
  }
}

/// 6. Location Permission State Widget
class LocationPermissionWidget extends StatelessWidget {
  const LocationPermissionWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.location_on_outlined, size: 48, color: AppColors.primary),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Location Access Needed',
            style: AppTypography.h2(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'Turn on background location to receive nearby trip requests and active navigation.',
            style: AppTypography.body(color: AppColors.textSecondaryLight),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppPrimaryButton(
            text: 'ENABLE LOCATION',
            onPressed: () => Fluttertoast.showToast(msg: 'Location enabled!'),
          ),
        ],
      ),
    );
  }
}

/// 7. Notification Permission State Widget
class NotificationPermissionWidget extends StatelessWidget {
  const NotificationPermissionWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: const Color(0xFF8b5cf6).withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.notifications_active_outlined, size: 48, color: Color(0xFF8b5cf6)),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Enable Notifications',
            style: AppTypography.h2(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'Don\'t miss high-payout trip offers! Allow notifications to receive instant ride alerts.',
            style: AppTypography.body(color: AppColors.textSecondaryLight),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppPrimaryButton(
            text: 'ALLOW NOTIFICATIONS',
            onPressed: () => Fluttertoast.showToast(msg: 'Notifications allowed!'),
          ),
        ],
      ),
    );
  }
}

/// 8. Loading State Widget
class GlobalLoadingWidget extends StatelessWidget {
  const GlobalLoadingWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: AppColors.primary, strokeWidth: 3),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Loading Driver Data...',
            style: AppTypography.body(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            'Syncing trips, wallet & settings',
            style: AppTypography.caption(color: AppColors.textMutedLight),
          ),
        ],
      ),
    );
  }
}

/// 9. Empty State Widget
class GlobalEmptyWidget extends StatelessWidget {
  final String title;
  final String message;
  final IconData icon;
  final String? buttonText;
  final VoidCallback? onAction;

  const GlobalEmptyWidget({
    super.key,
    this.title = 'No Data Found',
    this.message = 'There are no records to display at this time.',
    this.icon = Icons.inbox_outlined,
    this.buttonText,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.borderLight.withValues(alpha: 0.5),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 48, color: AppColors.textMutedLight),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            title,
            style: AppTypography.h2(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            style: AppTypography.body(color: AppColors.textSecondaryLight),
            textAlign: TextAlign.center,
          ),
          if (buttonText != null && onAction != null) ...[
            const SizedBox(height: AppSpacing.xl),
            AppPrimaryButton(text: buttonText!, onPressed: onAction!),
          ],
        ],
      ),
    );
  }
}

/// 10. Maintenance State Widget
class MaintenanceWidget extends StatelessWidget {
  const MaintenanceWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: const Color(0xFF0284c7).withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.engineering_outlined, size: 48, color: Color(0xFF0284c7)),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'System Under Maintenance',
            style: AppTypography.h2(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'AdhocX is undergoing scheduled system upgrades. We will be back online shortly (Est. 02:00 AM).',
            style: AppTypography.body(color: AppColors.textSecondaryLight),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xl),
          ElevatedButton(
            onPressed: () => Fluttertoast.showToast(msg: 'Checking server status...'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0284c7),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
            ),
            child: const Text('CHECK STATUS', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
