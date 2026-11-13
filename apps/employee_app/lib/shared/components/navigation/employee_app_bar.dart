import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';

/// Standard screen AppBar — Driver app pattern:
/// page-background fill (bgLight / bgDark), no elevation, `arrow_back` icon,
/// title in AppTypography.h3 bold, light/dark aware.
class EmployeeAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final Widget? titleWidget;

  /// `null` keeps the platform default, like the Driver app.
  final bool? centerTitle;
  final VoidCallback? onBack;
  final bool showBackButton;
  final List<Widget>? actions;
  final Widget? trailing;
  final Color? iconColor;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final double elevation;
  final Widget? leading;

  const EmployeeAppBar({
    super.key,
    this.title,
    this.titleWidget,
    this.centerTitle,
    this.onBack,
    this.showBackButton = true,
    this.actions,
    this.trailing,
    this.iconColor,
    this.backgroundColor,
    this.foregroundColor,
    this.elevation = 0,
    this.leading,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveFg = iconColor ??
        foregroundColor ??
        (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight);
    final effectiveBg =
        backgroundColor ?? (isDark ? AppColors.bgDark : AppColors.bgLight);
    final effectiveActions = actions ?? (trailing != null ? [trailing!] : null);

    return AppBar(
      backgroundColor: effectiveBg,
      surfaceTintColor: Colors.transparent,
      elevation: elevation,
      scrolledUnderElevation: 0,
      centerTitle: centerTitle,
      automaticallyImplyLeading: false,
      leading: leading ??
          (showBackButton
              ? IconButton(
                  tooltip: 'Back',
                  icon: Icon(Icons.arrow_back, color: effectiveFg),
                  onPressed: onBack ??
                      () {
                        if (context.canPop()) {
                          context.pop();
                        } else {
                          Navigator.of(context).maybePop();
                        }
                      },
                )
              : null),
      title: titleWidget ??
          (title != null
              ? Text(
                  title!,
                  style: AppTypography.h3(
                    color: effectiveFg,
                    fontWeight: FontWeight.bold,
                  ),
                )
              : null),
      actions: effectiveActions,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

/// Home / overview greeting header with SOS shortcut and notification bell.
class EmployeeGreetingHeader extends StatelessWidget {
  final String name;
  final String greeting;
  final int unreadNotificationsCount;
  final VoidCallback? onNotificationTap;
  final VoidCallback? onSosTap;
  final VoidCallback? onProfileTap;

  const EmployeeGreetingHeader({
    super.key,
    required this.name,
    this.greeting = 'Good Morning,',
    this.unreadNotificationsCount = 1,
    this.onNotificationTap,
    this.onSosTap,
    this.onProfileTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary =
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final textSecondary =
        isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;

    return Row(
      children: [
        Expanded(
          child: InkWell(
            onTap: onProfileTap,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(greeting, style: AppTypography.body(color: textSecondary)),
                const SizedBox(height: 2),
                Text(
                  '$name 👋',
                  style: AppTypography.h2(color: textPrimary, fontSize: 20),
                ),
              ],
            ),
          ),
        ),
        if (onSosTap != null) ...[
          Semantics(
            button: true,
            label: 'SOS emergency',
            child: InkWell(
              onTap: onSosTap,
              customBorder: const CircleBorder(),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xs),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: const BoxDecoration(
                        color: AppColors.error,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.sos_rounded,
                          color: Colors.white, size: 20),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'SOS',
                      style: AppTypography.micro(
                        color: AppColors.error,
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
        ],
        Semantics(
          button: true,
          label: unreadNotificationsCount > 0
              ? 'Notifications, $unreadNotificationsCount unread'
              : 'Notifications',
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              InkWell(
                onTap: onNotificationTap,
                customBorder: const CircleBorder(),
                child: Container(
                  padding: const EdgeInsets.all(AppSpacing.sm + 2),
                  decoration: BoxDecoration(
                    color:
                        isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    ),
                  ),
                  child: Icon(
                    Icons.notifications_none_rounded,
                    color: textPrimary,
                    size: 22,
                  ),
                ),
              ),
              if (unreadNotificationsCount > 0)
                Positioned(
                  right: 4,
                  top: 4,
                  child: Container(
                    width: 9,
                    height: 9,
                    decoration: const BoxDecoration(
                      color: AppColors.error,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Section header with an optional action link ("View All").
class EmployeeSectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onActionTap;
  final EdgeInsetsGeometry padding;

  const EmployeeSectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onActionTap,
    this.padding = const EdgeInsets.symmetric(vertical: AppSpacing.sm),
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: padding,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: AppTypography.h4(
              color: isDark
                  ? AppColors.textPrimaryDark
                  : AppColors.textPrimaryLight,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (actionLabel != null && onActionTap != null)
            TextButton(
              onPressed: onActionTap,
              child: Text(
                actionLabel!,
                style: AppTypography.label(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
