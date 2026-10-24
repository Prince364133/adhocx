import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 4: Document Details Vault — dynamic, live API integrated.
class DocumentDetailsScreen extends StatefulWidget {
  const DocumentDetailsScreen({super.key});

  @override
  State<DocumentDetailsScreen> createState() => _DocumentDetailsScreenState();
}

class _DocumentDetailsScreenState extends State<DocumentDetailsScreen> {
  bool _isLoading = true;
  Map<String, dynamic> _profile = {};

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
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

  void _showDocumentPreview(String title, String? fileUrl) {
    if (fileUrl == null || fileUrl.isEmpty) {
      Fluttertoast.showToast(msg: 'No document photo uploaded yet for $title');
      return;
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: AppTypography.h3(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.md),
                child: Image.network(
                  fileUrl,
                  height: 260,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Container(
                    height: 200,
                    color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
                    alignment: Alignment.center,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.broken_image_outlined, size: 48, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                        const SizedBox(height: 8),
                        Text('Unable to load document image', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Done'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final user = AuthService.instance.currentUser;
    final driverProf = user?.driverProfile ?? {};
    final kycDocs = (_profile['kycDocuments'] is Map ? _profile['kycDocuments'] as Map : null) ??
                    (driverProf['kycDocuments'] is Map ? driverProf['kycDocuments'] as Map : null) ?? {};

    final status = (_profile['verificationStatus'] ?? driverProf['verificationStatus'] ?? user?.verificationStatus ?? 'PENDING').toString().toUpperCase();
    final isVerified = status == 'VERIFIED' || status == 'APPROVED';
    final isUnderReview = status == 'UNDER_REVIEW';

    final String verifiedStatusText = isVerified ? 'Verified' : (isUnderReview ? 'Under Review' : 'Pending');

    final dlUrl = _profile['dlFrontUrl'] ?? driverProf['dlFrontUrl'] ?? kycDocs['dlFrontUrl'];
    final aadharUrl = _profile['aadharFrontUrl'] ?? _profile['aadharBackUrl'] ?? driverProf['aadharFrontUrl'] ?? driverProf['aadharBackUrl'] ?? kycDocs['aadharFrontUrl'] ?? kycDocs['aadharBackUrl'];
    final panUrl = _profile['panDocUrl'] ?? driverProf['panDocUrl'] ?? kycDocs['panDocUrl'];
    final rcFrontUrl = _profile['rcFrontUrl'] ?? _profile['rcDocUrl'] ?? driverProf['rcFrontUrl'] ?? driverProf['rcDocUrl'] ?? kycDocs['rcFrontUrl'] ?? kycDocs['rcDocUrl'];
    final rcBackUrl = _profile['rcBackUrl'] ?? driverProf['rcBackUrl'] ?? kycDocs['rcBackUrl'];
    final insUrl = _profile['insuranceDocUrl'] ?? driverProf['insuranceDocUrl'] ?? kycDocs['insuranceDocUrl'];
    final vehUrl = _profile['vehiclePhotoUrl'] ?? driverProf['vehiclePhotoUrl'] ?? kycDocs['vehiclePhotoUrl'];
    final photoUrl = _profile['profilePhotoUrl'] ?? driverProf['profilePhotoUrl'] ?? kycDocs['profilePhotoUrl'] ?? user?.photoUrl;

    final docs = [
      {
        'title': 'Profile Photo / Selfie',
        'docNumber': (photoUrl != null && photoUrl.toString().isNotEmpty) ? 'Profile Verified' : '—',
        'status': (photoUrl != null && photoUrl.toString().isNotEmpty) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Permanent',
        'icon': Icons.account_circle_outlined,
        'fileUrl': photoUrl as String?,
      },
      {
        'title': 'Driving License',
        'docNumber': _profile['licenseNumber'] ?? (dlUrl != null ? 'Uploaded' : '—'),
        'status': (dlUrl != null) ? verifiedStatusText : 'Not Uploaded',
        'validTill': _profile['licenseExpiry'] ?? 'Active',
        'icon': Icons.badge_outlined,
        'fileUrl': dlUrl as String?,
      },
      {
        'title': 'Aadhaar Card',
        'docNumber': (aadharUrl != null) ? 'Verified Document' : '—',
        'status': (aadharUrl != null) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Permanent',
        'icon': Icons.credit_card_outlined,
        'fileUrl': aadharUrl as String?,
      },
      {
        'title': 'PAN Card',
        'docNumber': _profile['panNumber'] ?? (panUrl != null ? 'Uploaded' : '—'),
        'status': (panUrl != null) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Permanent',
        'icon': Icons.account_balance_wallet_outlined,
        'fileUrl': panUrl as String?,
      },
      {
        'title': 'Vehicle Registration (RC Front)',
        'docNumber': _profile['vehiclePlate'] ?? (rcFrontUrl != null ? 'Uploaded' : '—'),
        'status': (rcFrontUrl != null) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Active',
        'icon': Icons.directions_car_outlined,
        'fileUrl': rcFrontUrl as String?,
      },
      {
        'title': 'Vehicle Registration (RC Back)',
        'docNumber': _profile['vehiclePlate'] ?? (rcBackUrl != null ? 'Uploaded' : '—'),
        'status': (rcBackUrl != null) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Active',
        'icon': Icons.directions_car_outlined,
        'fileUrl': rcBackUrl as String?,
      },
      {
        'title': 'Commercial Insurance',
        'docNumber': (insUrl != null) ? 'Policy on File' : '—',
        'status': (insUrl != null) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Active',
        'icon': Icons.security_outlined,
        'fileUrl': insUrl as String?,
      },
      {
        'title': 'Vehicle Photo',
        'docNumber': _profile['vehicleModel'] ?? (vehUrl != null ? 'Verified Model' : '—'),
        'status': (vehUrl != null) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Permanent',
        'icon': Icons.photo_camera_front_outlined,
        'fileUrl': vehUrl as String?,
      },
    ];

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
                            context.go(AppRoutes.kycVerificationScreen);
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
                          'Document Details',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Document List ────────────────────────────────
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : RefreshIndicator(
                          onRefresh: _loadProfile,
                          child: ListView.separated(
                            padding: const EdgeInsets.all(AppSpacing.lg),
                            itemCount: docs.length,
                            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                            itemBuilder: (context, index) {
                              final doc = docs[index];
                              final hasUrl = doc['fileUrl'] != null;
                              final docStatus = doc['status'] as String;
                              final isDocVerified = docStatus == 'Verified';
                              final isDocUnderReview = docStatus == 'Under Review';
                              final isDocNotUploaded = docStatus == 'Not Uploaded';

                              final Color statusColor = isDocVerified
                                  ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
                                  : (isDocUnderReview
                                      ? Colors.amber
                                      : (isDocNotUploaded
                                          ? (isDark ? AppColors.textMutedDark : AppColors.textMutedLight)
                                          : AppColors.primary));

                              return Container(
                                padding: const EdgeInsets.all(AppSpacing.lg),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(
                                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: isDark ? 0.2 : 0.1),
                                        borderRadius: BorderRadius.circular(AppRadius.md),
                                      ),
                                      child: Icon(
                                        doc['icon'] as IconData,
                                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            doc['title'] as String,
                                            style: AppTypography.body(
                                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Number: ${doc['docNumber']}',
                                            style: AppTypography.caption(
                                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                            ),
                                          ),
                                          Text(
                                            'Status: ${doc['validTill']}',
                                            style: AppTypography.caption(
                                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: statusColor.withValues(alpha: isDark ? 0.2 : 0.12),
                                            borderRadius: BorderRadius.circular(AppRadius.xs),
                                          ),
                                          child: Text(
                                            docStatus,
                                            style: AppTypography.caption(
                                              color: statusColor,
                                              fontWeight: FontWeight.bold,
                                            ).copyWith(fontSize: 10),
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        GestureDetector(
                                          onTap: () => _showDocumentPreview(doc['title'] as String, doc['fileUrl'] as String?),
                                          child: Text(
                                            hasUrl ? 'View Photo' : 'No Photo',
                                            style: AppTypography.caption(
                                              color: hasUrl
                                                  ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                                  : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
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
}
