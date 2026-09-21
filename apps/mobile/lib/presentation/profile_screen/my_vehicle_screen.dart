import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 2: My Vehicle screen connected to live backend data (No mock data, no 'Add Vehicle' button).
class MyVehicleScreen extends StatefulWidget {
  const MyVehicleScreen({super.key});

  @override
  State<MyVehicleScreen> createState() => _MyVehicleScreenState();
}

class _MyVehicleScreenState extends State<MyVehicleScreen> {
  Map<String, dynamic>? _profile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final res = await DriverService.instance.getProfile();
      if (res != null && mounted) {
        setState(() {
          _profile = Map<String, dynamic>.from(res is Map ? res : {});
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final onboarding = context.watch<OnboardingProvider>();

    // Live driver vehicle values with zero dummy hardcoded fallbacks
    final rawModel = _profile?['vehicleModel'] ?? onboarding.carModel;
    final vehicleModel = (rawModel != null && rawModel.toString().trim().isNotEmpty)
        ? rawModel.toString().trim()
        : null;

    final rawType = _profile?['vehicleType'] ?? onboarding.vehicleType;
    final vehicleType = (rawType != null && rawType.toString().trim().isNotEmpty)
        ? rawType.toString().trim()
        : 'Vehicle';

    final rawPlate = _profile?['vehiclePlate'] ?? onboarding.registrationNumber;
    final vehiclePlate = (rawPlate != null && rawPlate.toString().trim().isNotEmpty)
        ? rawPlate.toString().trim().toUpperCase()
        : null;

    final rawColor = _profile?['vehicle']?['color'] ?? onboarding.color;
    final vehicleColor = (rawColor != null && rawColor.toString().trim().isNotEmpty)
        ? rawColor.toString().trim()
        : null;

    final rawYear = _profile?['vehicle']?['year'] ?? onboarding.modelYear;
    final vehicleYear = (rawYear != null && rawYear.toString().trim().isNotEmpty)
        ? rawYear.toString().trim()
        : null;

    final rawStatus = _profile?['verificationStatus']?.toString().toUpperCase() ?? 'PENDING';
    final isVerified = rawStatus == 'VERIFIED';
    final isUnderReview = rawStatus == 'UNDER_REVIEW';

    final String statusLabel = isVerified
        ? 'Verified'
        : (isUnderReview ? 'Under Review' : 'Pending Verification');
    final Color statusColor = isVerified
        ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
        : (isUnderReview
            ? AppColors.warning
            : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight));

    final hasVehicle = vehiclePlate != null && vehiclePlate.isNotEmpty;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header (Clean header without 'Add Vehicle' button) ────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.profileScreen);
                          }
                        },
                        icon: Icon(
                          Icons.arrow_back,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'My Vehicle',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Content ───────────────────────────────────────
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : ListView(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          children: [
                            if (hasVehicle) ...[
                              // ── Vehicle Main Card ──────────────────────────
                              Container(
                                padding: const EdgeInsets.all(AppSpacing.xl),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(
                                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    // Vehicle Photo / Illustration
                                    Container(
                                      height: 120,
                                      width: double.infinity,
                                      decoration: BoxDecoration(
                                        color: isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight,
                                        borderRadius: BorderRadius.circular(AppRadius.md),
                                      ),
                                      child: Center(
                                        child: Icon(
                                          Icons.directions_car_rounded,
                                          size: 72,
                                          color: (isDark ? AppColors.primaryLight : AppColors.primary)
                                              .withValues(alpha: 0.8),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: AppSpacing.lg),

                                    // Title & Badges
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                vehicleModel ?? 'Commercial Vehicle',
                                                style: AppTypography.h2(
                                                  color: isDark
                                                      ? AppColors.textPrimaryDark
                                                      : AppColors.textPrimaryLight,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                vehicleColor != null
                                                    ? '$vehicleType • $vehicleColor'
                                                    : vehicleType,
                                                style: AppTypography.body(
                                                  color: isDark
                                                      ? AppColors.textSecondaryDark
                                                      : AppColors.textSecondaryLight,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 10,
                                            vertical: 4,
                                          ),
                                          decoration: BoxDecoration(
                                            color: statusColor.withValues(alpha: isDark ? 0.2 : 0.12),
                                            borderRadius: BorderRadius.circular(AppRadius.full),
                                          ),
                                          child: Text(
                                            statusLabel,
                                            style: AppTypography.caption(
                                              color: statusColor,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: AppSpacing.md),

                                    // License Plate & Model Year
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 6,
                                          ),
                                          decoration: BoxDecoration(
                                            color: isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight,
                                            border: Border.all(
                                              color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                            ),
                                            borderRadius: BorderRadius.circular(AppRadius.sm),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                Icons.subtitles_outlined,
                                                size: 16,
                                                color: isDark
                                                    ? AppColors.textPrimaryDark
                                                    : AppColors.textPrimaryLight,
                                              ),
                                              const SizedBox(width: 6),
                                              Text(
                                                vehiclePlate,
                                                style: AppTypography.body(
                                                  color: isDark
                                                      ? AppColors.textPrimaryDark
                                                      : AppColors.textPrimaryLight,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const Spacer(),
                                        if (vehicleYear != null)
                                          Text(
                                            'Year: $vehicleYear',
                                            style: AppTypography.caption(
                                              color: isDark
                                                  ? AppColors.textMutedDark
                                                  : AppColors.textMutedLight,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: AppSpacing.xl),

                              // ── Vehicle Details List Card ──────────────────
                              Container(
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(
                                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    _buildInfoTile(
                                      label: 'Registration Number',
                                      value: vehiclePlate,
                                      isDark: isDark,
                                    ),
                                    Divider(
                                      height: 1,
                                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                    ),
                                    _buildInfoTile(
                                      label: 'Category',
                                      value: vehicleType,
                                      isDark: isDark,
                                    ),
                                    Divider(
                                      height: 1,
                                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                    ),
                                    _buildInfoTile(
                                      label: 'Verification Status',
                                      value: statusLabel,
                                      badgeText: isVerified ? 'Verified' : 'Under Review',
                                      badgeColor: statusColor,
                                      isDark: isDark,
                                    ),
                                  ],
                                ),
                              ),
                            ] else ...[
                              // ── Empty State: No Vehicle Registered ─────────
                              Container(
                                padding: const EdgeInsets.all(AppSpacing.xxl),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(
                                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(AppSpacing.lg),
                                      decoration: BoxDecoration(
                                        color: (isDark ? AppColors.primaryLight : AppColors.primary)
                                            .withValues(alpha: 0.1),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(
                                        Icons.directions_car_outlined,
                                        size: 48,
                                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                                      ),
                                    ),
                                    const SizedBox(height: AppSpacing.md),
                                    Text(
                                      'No Vehicle Registered',
                                      style: AppTypography.h3(
                                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: AppSpacing.xs),
                                    Text(
                                      'Complete your driver onboarding steps to submit vehicle details for verification.',
                                      textAlign: TextAlign.center,
                                      style: AppTypography.body(
                                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],

                            const SizedBox(height: AppSpacing.lg),

                            // ── View Documents Action Tile ───────────────────
                            Container(
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                border: Border.all(
                                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                ),
                              ),
                              child: ListTile(
                                onTap: () => context.push(AppRoutes.documentDetailsScreen),
                                leading: Icon(
                                  Icons.description_outlined,
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                ),
                                title: Text(
                                  'View Vehicle Documents',
                                  style: AppTypography.body(
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                trailing: Icon(
                                  Icons.chevron_right,
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoTile({
    required String label,
    required String value,
    required bool isDark,
    String? badgeText,
    Color? badgeColor,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTypography.body(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
          ),
          Row(
            children: [
              Text(
                value,
                style: AppTypography.body(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (badgeText != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: (badgeColor ?? AppColors.primary).withValues(alpha: isDark ? 0.2 : 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.xs),
                  ),
                  child: Text(
                    badgeText,
                    style: AppTypography.caption(
                      color: badgeColor ?? (isDark ? AppColors.primaryLight : AppColors.primary),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
