import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
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
/// - Allows the user to decline ('NOT NOW') without triggering any OS runtime permission prompts.
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
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.lg),
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
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Top drag pill
              Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Animated/Prominent Icon Badge
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.location_on_rounded,
                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                  size: 38,
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // Main Policy Title
              Text(
                'Location Access & Prominent Disclosure',
                style: AppTypography.h2(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),

              // Badge indicator
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Required for Driver Duty Matching & Navigation',
                  style: AppTypography.caption(
                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // Introduction
              Text(
                'AdhocX Driver Partner accesses and collects your device\'s precise location data to deliver core corporate fleet and passenger transport features:',
                style: AppTypography.body(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.lg),

              // Itemized Feature List
              _buildFeatureItem(
                context,
                icon: Icons.radar_rounded,
                title: 'Real-Time Duty Dispatch Matching',
                description: 'Identifies your vehicle\'s live location to discover and match nearby corporate cab bookings and duty opportunities.',
                isDark: isDark,
              ),
              const SizedBox(height: AppSpacing.sm),

              _buildFeatureItem(
                context,
                icon: Icons.navigation_rounded,
                title: 'Turn-by-Turn Road Navigation',
                description: 'Provides live road navigation and route guidance to passenger pickup locations and company destinations.',
                isDark: isDark,
              ),
              const SizedBox(height: AppSpacing.sm),

              _buildFeatureItem(
                context,
                icon: Icons.security_rounded,
                title: 'Live Route Tracking & Passenger Safety',
                description: 'Calculates accurate road distance, traffic-aware ETA, and shares live trip progress with passengers and enterprise fleet managers.',
                isDark: isDark,
              ),
              const SizedBox(height: AppSpacing.md),

              // Background Location Mandatory Google Play Disclosure Box
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: (isDark ? AppColors.primary : AppColors.primary).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.schedule_rounded,
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      size: 24,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Background Location Disclosure',
                            style: AppTypography.body(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'AdhocX Driver Partner collects location data to enable duty dispatch matching, turn-by-turn navigation, and live trip tracking even when the app is closed or not in use (while you are Online or on an Active Duty).',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'This ensures you never miss a corporate duty dispatch offer and passengers can track their cab arrival even if you switch apps or lock your screen.',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),

              // Privacy & Data Security Assurance
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.lock_outline_rounded,
                    color: AppColors.accentGreenDark,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Your location data is encrypted in transit (TLS 1.3), accessed only when you are Online or on duty, and is NEVER sold or shared with third parties for advertising.',
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),

              // Affirmative Consent Button
              AppPrimaryButton(
                text: _isRequesting ? 'REQUESTING PERMISSION...' : 'AGREE & CONTINUE',
                isLoading: _isRequesting,
                onPressed: _isRequesting ? null : _handleAffirmativeConsent,
              ),
              const SizedBox(height: AppSpacing.sm),

              // Negative / Dismiss Button (Strictly does NOT prompt OS runtime permission)
              TextButton(
                onPressed: _handleDeclineConsent,
                child: Text(
                  'Not Now',
                  style: AppTypography.body(
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
            ],
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
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            size: 20,
            color: isDark ? AppColors.primaryLight : AppColors.primary,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTypography.body(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: AppTypography.caption(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
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
      // Step: User gave affirmative consent on prominent disclosure -> Now trigger runtime permission from OS
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
    // Strictly dismiss without calling any OS runtime permission request
    EdgeCaseManager.instance.dismissLocationDisclosureModal();
    Fluttertoast.showToast(
      msg: 'Location access is required to receive trip offers.',
      backgroundColor: AppColors.warning,
    );
  }
}
