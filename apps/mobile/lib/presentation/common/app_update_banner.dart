import 'package:flutter/material.dart';
import '../../services/app_update_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';

/// A sleek, non-intrusive in-app banner that notifies users when a newer
/// version of AdhocX is available on Google Play Store or APK channel.
///
/// Automatically hides when no update is available or when dismissed
/// for the current session by the user.
class AppUpdateBanner extends StatelessWidget {
  final EdgeInsetsGeometry? margin;

  const AppUpdateBanner({
    super.key,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ListenableBuilder(
      listenable: AppUpdateService.instance,
      builder: (context, _) {
        if (!AppUpdateService.instance.hasUpdate) {
          return const SizedBox.shrink();
        }

        final info = AppUpdateService.instance.updateInfo;
        final latestVersion = info?.latestVersion ?? 'Latest';

        return Container(
          margin: margin ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEEF2FF),
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(
              color: const Color(0xFF6366F1).withValues(alpha: isDark ? 0.45 : 0.35),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              // Icon container
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withValues(alpha: isDark ? 0.25 : 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.system_update_rounded,
                  size: 16,
                  color: Color(0xFF6366F1),
                ),
              ),
              const SizedBox(width: 10),

              // Title and version label
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            'Update Available',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: const Color(0xFF6366F1).withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(AppRadius.xs),
                          ),
                          child: Text(
                            'v$latestVersion',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF6366F1),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Tap update for latest fleet features',
                      style: TextStyle(
                        fontSize: 10,
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Action button: "Update"
              GestureDetector(
                onTap: () => AppUpdateService.instance.openPlayStoreUpdate(),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                    ),
                    borderRadius: BorderRadius.circular(AppRadius.full),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF6366F1).withValues(alpha: 0.3),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Update',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(width: 3),
                      Icon(Icons.arrow_forward_rounded, size: 11, color: Colors.white),
                    ],
                  ),
                ),
              ),

              // Dismiss button
              GestureDetector(
                onTap: () => AppUpdateService.instance.dismissForSession(),
                child: Padding(
                  padding: const EdgeInsets.only(left: 6),
                  child: Icon(
                    Icons.close_rounded,
                    size: 16,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
