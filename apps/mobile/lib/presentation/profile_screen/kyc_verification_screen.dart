import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 3: KYC & Verification screen — dynamic, live API integrated.
class KycVerificationScreen extends StatefulWidget {
  const KycVerificationScreen({super.key});

  @override
  State<KycVerificationScreen> createState() => _KycVerificationScreenState();
}

class _KycVerificationScreenState extends State<KycVerificationScreen> {
  bool _isLoading = true;
  Map<String, dynamic> _profile = {};

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    try {
      final res = await DriverService.instance.getProfile(forceRefresh: true);
      if (mounted && res is Map) {
        setState(() {
          _profile = Map<String, dynamic>.from(res);
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

    final user = AuthService.instance.currentUser;
    final status = (_profile['verificationStatus'] ?? user?.verificationStatus ?? 'PENDING').toString().toUpperCase();
    final isVerified = status == 'VERIFIED' || status == 'APPROVED';
    final isUnderReview = status == 'UNDER_REVIEW';
    final isRejected = status == 'REJECTED';

    final Color statusColor = isVerified
        ? AppColors.accentGreenDark
        : (isUnderReview ? AppColors.warning : (isRejected ? AppColors.error : AppColors.primary));
    final Color statusTextColor = isVerified
        ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
        : (isUnderReview
            ? (isDark ? Colors.amberAccent : AppColors.warning)
            : (isRejected ? (isDark ? Colors.redAccent : AppColors.error) : (isDark ? AppColors.primaryLight : AppColors.primary)));

    final String statusTitle = isVerified
        ? 'Verified'
        : (isUnderReview ? 'Under Review' : (isRejected ? 'Rejected' : 'Pending'));
    final String statusSubtitle = isVerified
        ? 'Your KYC documents are verified and approved.'
        : (isUnderReview
            ? 'Your documents are being reviewed by the AdhocX team.'
            : (isRejected
                ? (_profile['rejectionReason']?.toString() ?? 'Please re-upload your valid documents.')
                : 'Complete and submit your KYC documents.'));

    // Check individual document uploads from live profile
    final hasDl = _profile['dlFrontUrl'] != null && _profile['dlFrontUrl'].toString().isNotEmpty;
    final hasRc = _profile['rcDocUrl'] != null && _profile['rcDocUrl'].toString().isNotEmpty;
    final hasIns = _profile['insuranceDocUrl'] != null && _profile['insuranceDocUrl'].toString().isNotEmpty;
    final hasVeh = _profile['vehiclePhotoUrl'] != null && _profile['vehiclePhotoUrl'].toString().isNotEmpty;
    final hasAadhar = (_profile['aadharFrontUrl'] != null && _profile['aadharFrontUrl'].toString().isNotEmpty) ||
        (_profile['aadharBackUrl'] != null && _profile['aadharBackUrl'].toString().isNotEmpty);
    final hasPan = _profile['panDocUrl'] != null && _profile['panDocUrl'].toString().isNotEmpty;
    final hasPhoto = (_profile['profilePhotoUrl'] != null && _profile['profilePhotoUrl'].toString().isNotEmpty) || hasVeh;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
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
                      Text(
                        'KYC & Verification',
                        style: AppTypography.h3(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Body ──────────────────────────────────────────
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : RefreshIndicator(
                          onRefresh: _fetchProfile,
                          child: ListView(
                            padding: const EdgeInsets.all(AppSpacing.lg),
                            children: [
                              // ── Status Banner Card ─────────────────────────────────
                              Container(
                                padding: const EdgeInsets.all(AppSpacing.xl),
                                decoration: BoxDecoration(
                                  color: statusColor.withValues(alpha: isDark ? 0.15 : 0.08),
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(
                                    color: statusColor.withValues(alpha: 0.25),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'KYC Status',
                                            style: AppTypography.caption(
                                              color: statusTextColor,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            statusTitle,
                                            style: AppTypography.h1(
                                              color: statusTextColor,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            statusSubtitle,
                                            style: AppTypography.body(
                                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      width: 48,
                                      height: 48,
                                      decoration: BoxDecoration(
                                        color: statusColor.withValues(alpha: isDark ? 0.2 : 0.15),
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: statusTextColor,
                                          width: 2,
                                        ),
                                      ),
                                      child: Icon(
                                        isVerified
                                            ? Icons.check_rounded
                                            : (isUnderReview
                                                ? Icons.schedule_rounded
                                                : (isRejected ? Icons.close_rounded : Icons.info_outline)),
                                        color: statusTextColor,
                                        size: 28,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: AppSpacing.xl),

                              // ── Submitted Documents Section ───────────────────────
                              Text(
                                'Submitted Documents',
                                style: AppTypography.body(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.md),

                              // ── Documents Card List ────────────────────────────────
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
                                    _buildDocumentTile(
                                      context: context,
                                      icon: Icons.credit_card_outlined,
                                      title: 'Aadhaar Card',
                                      isDark: isDark,
                                      isUploaded: hasAadhar,
                                      overallStatus: status,
                                    ),
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildDocumentTile(
                                      context: context,
                                      icon: Icons.badge_outlined,
                                      title: 'PAN Card',
                                      isDark: isDark,
                                      isUploaded: hasPan,
                                      overallStatus: status,
                                    ),
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildDocumentTile(
                                      context: context,
                                      icon: Icons.drive_eta_outlined,
                                      title: 'Driving License',
                                      isDark: isDark,
                                      isUploaded: hasDl,
                                      overallStatus: status,
                                    ),
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildDocumentTile(
                                      context: context,
                                      icon: Icons.description_outlined,
                                      title: 'Vehicle Registration (RC)',
                                      isDark: isDark,
                                      isUploaded: hasRc,
                                      overallStatus: status,
                                    ),
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildDocumentTile(
                                      context: context,
                                      icon: Icons.security_outlined,
                                      title: 'Commercial Insurance',
                                      isDark: isDark,
                                      isUploaded: hasIns,
                                      overallStatus: status,
                                    ),
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildDocumentTile(
                                      context: context,
                                      icon: Icons.account_circle_outlined,
                                      title: 'Profile Photo / Selfie',
                                      isDark: isDark,
                                      isUploaded: hasPhoto,
                                      overallStatus: status,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: AppSpacing.lg),

                              // ── Info Bottom Footer ─────────────────────────────────
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: AppSpacing.lg,
                                  vertical: AppSpacing.md,
                                ),
                                decoration: BoxDecoration(
                                  color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: isDark ? 0.15 : 0.12),
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.info_outline_rounded,
                                      size: 18,
                                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        isVerified
                                            ? 'All documents are verified and compliant with AdhocX standards.'
                                            : 'Keep your documents updated for fast trip dispatch and verification.',
                                        style: AppTypography.caption(
                                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                                          fontWeight: FontWeight.w600,
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
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDocumentTile({
    required BuildContext context,
    required IconData icon,
    required String title,
    required bool isDark,
    required bool isUploaded,
    required String overallStatus,
  }) {
    final bool isVerified = isUploaded && (overallStatus == 'VERIFIED' || overallStatus == 'APPROVED');
    final bool isUnderReview = isUploaded && overallStatus == 'UNDER_REVIEW';
    final bool isRejected = isUploaded && overallStatus == 'REJECTED';

    final String label = !isUploaded
        ? 'Not Uploaded'
        : (isVerified ? 'Verified' : (isUnderReview ? 'Under Review' : (isRejected ? 'Rejected' : 'Uploaded')));

    final Color badgeColor = !isUploaded
        ? (isDark ? AppColors.textMutedDark : AppColors.textMutedLight)
        : (isVerified
            ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
            : (isUnderReview ? Colors.amber : (isRejected ? Colors.redAccent : AppColors.primary)));

    final IconData badgeIcon = !isUploaded
        ? Icons.radio_button_unchecked
        : (isVerified
            ? Icons.check_circle_rounded
            : (isUnderReview ? Icons.schedule_rounded : (isRejected ? Icons.cancel_rounded : Icons.check_circle_outline)));

    return ListTile(
      onTap: () => context.push(AppRoutes.documentDetailsScreen),
      leading: Icon(
        icon,
        size: 20,
        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
      ),
      title: Text(
        title,
        style: AppTypography.body(
          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          fontWeight: FontWeight.w600,
        ),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: AppTypography.caption(
              color: badgeColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 6),
          Icon(
            badgeIcon,
            size: 18,
            color: badgeColor,
          ),
        ],
      ),
    );
  }
}
