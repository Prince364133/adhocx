import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/auth_service.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserAccountStatusScreen extends StatefulWidget {
  const UserAccountStatusScreen({super.key});

  @override
  State<UserAccountStatusScreen> createState() => _UserAccountStatusScreenState();
}

class _UserAccountStatusScreenState extends State<UserAccountStatusScreen> {
  bool _isLoading = true;
  Map<String, dynamic> _vendorProfile = {};

  static const _months = [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final res = await UserService.instance.getVendorProfile(forceRefresh: true);
      if (mounted && res is Map) {
        setState(() {
          _vendorProfile = Map<String, dynamic>.from(res);
          _isLoading = false;
        });
      } else if (mounted) {
        setState(() => _isLoading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatDate(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return '—';
    try {
      final dt = DateTime.parse(isoDate).toLocal();
      final day = dt.day.toString().padLeft(2, '0');
      final month = (dt.month >= 1 && dt.month <= 12) ? _months[dt.month] : '';
      return '$day $month ${dt.year}';
    } catch (_) {
      return isoDate;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final user = AuthService.instance.currentUser;
    final vendor = _vendorProfile.isNotEmpty ? _vendorProfile : (user?.vendorProfile ?? {});
    final status = (vendor['verificationStatus'] ?? 'PENDING').toString().toUpperCase();
    final isVerified = status == 'VERIFIED' || status == 'APPROVED';
    final isUnderReview = status == 'UNDER_REVIEW';

    final memberSince = _formatDate(vendor['createdAt']?.toString());

    final hasCompany = (vendor['businessName'] != null && vendor['businessName'].toString().isNotEmpty) ||
        (vendor['companyName'] != null && vendor['companyName'].toString().isNotEmpty) ||
        (user?.fullName != null && user!.fullName!.isNotEmpty);
    final hasGst = _vendorProfile['gstNumber'] != null && _vendorProfile['gstNumber'].toString().isNotEmpty;
    final hasPan = _vendorProfile['panNumber'] != null && _vendorProfile['panNumber'].toString().isNotEmpty;
    final hasDocs = _vendorProfile['businessDocUrl'] != null || _vendorProfile['documentUrl'] != null;
    final hasBank = _vendorProfile['bankAccountNumber'] != null && _vendorProfile['bankAccountNumber'].toString().isNotEmpty;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('Account Status', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Verified User Banner Card
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: (isVerified ? AppColors.success : (isUnderReview ? AppColors.warning : AppColors.primary)).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(
                          color: (isVerified ? AppColors.success : (isUnderReview ? AppColors.warning : AppColors.primary)).withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: isVerified ? AppColors.success : (isUnderReview ? AppColors.warning : AppColors.primary),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isVerified ? Icons.verified_user : (isUnderReview ? Icons.schedule : Icons.account_circle),
                              color: Colors.white,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isVerified ? 'Verified Enterprise Account' : (isUnderReview ? 'Account Under Review' : 'Active Booker Account'),
                                  style: AppTypography.h4(
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  isVerified
                                      ? 'Your business profile is verified for direct fleet booking.'
                                      : (isUnderReview
                                          ? 'Your verification documents are being reviewed.'
                                          : 'Complete your profile verification for priority dispatch.'),
                                  style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Verification Details List
                    Text('Verification Details', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        children: [
                          _buildItem(context, Icons.business, 'Company Verification', hasCompany, isDark),
                          const Divider(),
                          _buildItem(context, Icons.receipt_long, 'GST Verification', hasGst || isVerified, isDark),
                          const Divider(),
                          _buildItem(context, Icons.badge_outlined, 'PAN Verification', hasPan || isVerified, isDark),
                          const Divider(),
                          _buildItem(context, Icons.description_outlined, 'Document Verification', hasDocs || isVerified, isDark),
                          const Divider(),
                          _buildItem(context, Icons.account_balance_outlined, 'Bank Account Verification', hasBank || isVerified, isDark),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Account Status Active Card
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Account Status', style: AppTypography.h4(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: (isVerified ? AppColors.success : AppColors.primary).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                ),
                                child: Text(
                                  isVerified ? 'Active' : 'Registered',
                                  style: TextStyle(
                                    color: isVerified ? AppColors.success : AppColors.primary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Your corporate booking account is active on the AdhocX network.',
                            style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                          ),
                          const SizedBox(height: 4),
                          Text('Member since $memberSince', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildItem(BuildContext context, IconData icon, String label, bool isDone, bool isDark) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          isDone ? 'Verified' : 'Pending',
          style: TextStyle(
            color: isDone ? AppColors.success : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
            fontWeight: FontWeight.bold,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}
