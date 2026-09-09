import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 4: Document Details Vault matching exact design guidelines.
class DocumentDetailsScreen extends StatelessWidget {
  const DocumentDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final docs = [
      {
        'title': 'Driving License',
        'docNumber': 'DL-1420110012345',
        'status': 'Verified',
        'validTill': '12 Jan 2030',
        'icon': Icons.badge_outlined,
      },
      {
        'title': 'Aadhaar Card',
        'docNumber': '•••• •••• 5678',
        'status': 'Verified',
        'validTill': 'Permanent',
        'icon': Icons.credit_card_outlined,
      },
      {
        'title': 'PAN Card',
        'docNumber': 'ABCDE1234F',
        'status': 'Verified',
        'validTill': 'Permanent',
        'icon': Icons.account_balance_wallet_outlined,
      },
      {
        'title': 'Vehicle Registration (RC)',
        'docNumber': 'HR 26 AB 1234',
        'status': 'Verified',
        'validTill': '11 Mar 2036',
        'icon': Icons.directions_car_outlined,
      },
      {
        'title': 'Commercial Insurance',
        'docNumber': 'POL-992384721',
        'status': 'Valid',
        'validTill': '20 Feb 2026',
        'icon': Icons.security_outlined,
      },
      {
        'title': 'Pollution Certificate (PUC)',
        'docNumber': 'PUC-88219482',
        'status': 'Valid',
        'validTill': '10 Dec 2025',
        'icon': Icons.eco_outlined,
      },
    ];

    return Scaffold(
      backgroundColor: AppColors.bgLight,
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
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
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
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Document Details',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Document List ────────────────────────────────
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    itemCount: docs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                    itemBuilder: (context, index) {
                      final doc = docs[index];

                      return Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(AppRadius.md),
                              ),
                              child: Icon(
                                doc['icon'] as IconData,
                                color: AppColors.primary,
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
                                      color: AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Number: ${doc['docNumber']}',
                                    style: AppTypography.caption(
                                      color: AppColors.textSecondaryLight,
                                    ),
                                  ),
                                  Text(
                                    'Valid Till: ${doc['validTill']}',
                                    style: AppTypography.caption(
                                      color: AppColors.textMutedLight,
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
                                    color: AppColors.accentGreenDark.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(AppRadius.xs),
                                  ),
                                  child: Text(
                                    doc['status'] as String,
                                    style: AppTypography.caption(
                                      color: AppColors.accentGreenDark,
                                      fontWeight: FontWeight.bold,
                                    ).copyWith(fontSize: 10),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                GestureDetector(
                                  onTap: () {
                                    Fluttertoast.showToast(msg: 'Viewing ${doc['title']} preview');
                                  },
                                  child: Text(
                                    'View Photo',
                                    style: AppTypography.caption(
                                      color: AppColors.primary,
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
              ],
            ),
          ),
        ),
      ),
    );
  }
}
