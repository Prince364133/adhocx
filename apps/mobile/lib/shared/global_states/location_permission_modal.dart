import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/edge_case_manager.dart';
import '../../services/permission_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

/// In-App Prominent Disclosure and Consent Modal for Location & Background Location.
/// Fully compliant with Google Play Developer Policy (User Data & Prominent Disclosure Requirement):
/// - Explicitly describes the data accessed (precise and background location).
/// - Details the core features that use location data (dispatch, navigation, trip safety).
/// - Contains mandatory background disclosure phrasing ("even when the app is closed or not in use").
/// - Requires explicit affirmative user action ('AGREE & CONTINUE') BEFORE runtime permissions are requested.
/// - Allows the user to decline ('Not Now') without triggering any OS runtime permission prompts.
/// - Concise and compact layout so affirmative CTA is immediately visible without scrolling.
/// - Provides link to comprehensive website privacy & location policy.
class LocationPermissionModal extends StatefulWidget {
  const LocationPermissionModal({super.key});

  @override
  State<LocationPermissionModal> createState() => _LocationPermissionModalState();
}

class _LocationPermissionModalState extends State<LocationPermissionModal> {
  bool _isRequesting = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final maxSheetHeight = MediaQuery.of(context).size.height * 0.85;

    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: maxSheetHeight),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.2),
              blurRadius: 24,
              offset: const Offset(0, -6),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Top drag pill
                Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),

                // Icon Badge
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.location_on_rounded,
                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                    size: 26,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),

                // Main Policy Title (No truncation, wraps cleanly)
                Text(
                  'Location Access & Prominent Disclosure',
                  style: AppTypography.h2(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                    fontSize: 17,
                    overflow: TextOverflow.visible,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                ),
                const SizedBox(height: 4),

                // Badge indicator
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    'Required for Driver Duty Matching & Navigation',
                    style: AppTypography.caption(
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      fontWeight: FontWeight.w600,
                      fontSize: 11,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),

                // Itemized Feature List (Concise)
                _buildFeatureItem(
                  context,
                  icon: Icons.radar_rounded,
                  title: 'Real-Time Duty Dispatch Matching',
                  description: 'Matches vehicle location to nearby corporate bookings.',
                  isDark: isDark,
                ),
                const SizedBox(height: 6),

                _buildFeatureItem(
                  context,
                  icon: Icons.navigation_rounded,
                  title: 'Turn-by-Turn Road Navigation',
                  description: 'Live route guidance to passenger pickups.',
                  isDark: isDark,
                ),
                const SizedBox(height: 6),

                _buildFeatureItem(
                  context,
                  icon: Icons.security_rounded,
                  title: 'Live Route Tracking & Passenger Safety',
                  description: 'Calculates ETA and shares live trip progress.',
                  isDark: isDark,
                ),
                const SizedBox(height: AppSpacing.sm),

                // Background Location Mandatory Google Play Disclosure Box
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(
                      color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.25),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.schedule_rounded,
                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                        size: 18,
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Background Location Disclosure',
                              style: AppTypography.body(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'AdhocX Driver collects location data to enable duty dispatch matching, turn-by-turn navigation, and live trip tracking even when the app is closed or not in use (while you are Online or on an Active Duty).',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),

                // Website Privacy & Location Policy Link
                InkWell(
                  onTap: () => launchUrl(
                    Uri.parse('https://adhocx.com/privacy'),
                    mode: LaunchMode.externalApplication,
                  ),
                  borderRadius: BorderRadius.circular(4),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'View complete Location & Privacy Policy on website',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                            fontWeight: FontWeight.w600,
                            fontSize: 11,
                          ).copyWith(decoration: TextDecoration.underline),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          Icons.open_in_new_rounded,
                          size: 12,
                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),

                // Affirmative Consent Button (Visible without scrolling)
                AppPrimaryButton(
                  text: _isRequesting ? 'REQUESTING PERMISSION...' : 'AGREE & CONTINUE',
                  isLoading: _isRequesting,
                  onPressed: _isRequesting ? null : _handleAffirmativeConsent,
                ),
                const SizedBox(height: 2),

                // Negative / Dismiss Button (Strictly does NOT prompt OS runtime permission)
                TextButton(
                  onPressed: _handleDeclineConsent,
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    'Not Now',
                    style: AppTypography.body(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String description,
    required bool isDark,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(
            color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Icon(
            icon,
            size: 16,
            color: isDark ? AppColors.primaryLight : AppColors.primary,
          ),
        ),
        const SizedBox(width: AppSpacing.xs),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTypography.body(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              Text(
                description,
                style: AppTypography.caption(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _handleAffirmativeConsent() async {
    setState(() => _isRequesting = true);
    try {
      final granted = await PermissionService.instance.requestLocationPermission();
      if (mounted) {
        if (granted) {
          EdgeCaseManager.instance.grantLocationPermission();
          Fluttertoast.showToast(
            msg: 'Location permission enabled! You are ready to go online.',
            backgroundColor: AppColors.accentGreenDark,
          );
        } else {
          EdgeCaseManager.instance.dismissLocationDisclosureModal();
          Fluttertoast.showToast(
            msg: 'Location access is required to receive trip offers. You can enable it anytime.',
            backgroundColor: AppColors.warning,
          );
        }
      }
    } catch (e) {
      debugPrint('Error during affirmative consent: $e');
      if (mounted) {
        EdgeCaseManager.instance.dismissLocationDisclosureModal();
      }
    } finally {
      if (mounted) setState(() => _isRequesting = false);
    }
  }

  void _handleDeclineConsent() {
    EdgeCaseManager.instance.dismissLocationDisclosureModal();
    Fluttertoast.showToast(
      msg: 'Location access is required to receive trip offers.',
      backgroundColor: AppColors.warning,
    );
  }
}
