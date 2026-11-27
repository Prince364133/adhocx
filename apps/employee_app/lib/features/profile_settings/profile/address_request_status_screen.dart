import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../routes/app_routes.dart';
import '../../../shared/components/components.dart';
import '../../../state/employee_feature_provider.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../../../theme/employee_palette.dart';

class AddressRequestStatusScreen extends StatelessWidget {
  const AddressRequestStatusScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final features = context.watch<EmployeeFeatureProvider>();
    final pending = features.addressRequests
        .where((request) =>
            request['status']?.toString().toUpperCase() == 'PENDING')
        .toList();

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Address Update'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.pageHorizontal),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Registered address',
                style: AppTypography.h4(
                  color: p.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              FeatureSectionCard(
                borderColor: p.accent.withAlpha(80),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.home_rounded, color: p.accent),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Text(
                        features.registeredAddress.fullAddress,
                        style: AppTypography.small(
                          color: p.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              EmployeePrimaryButton(
                label: 'Request Address Change',
                icon: Icons.edit_location_alt_rounded,
                onPressed: () => context.push(AppRoutes.addressUpdateForm),
              ),
              if (pending.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.xxl),
                Text(
                  'Pending Approval',
                  style: AppTypography.h4(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                for (final request in pending) ...[
                  AddressRequestHistoryCard(request: request),
                  const SizedBox(height: AppSpacing.md),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.infoContainer,
                      borderRadius: AppRadius.borderLg,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Frontend simulation only',
                          style: AppTypography.caption(
                            color: AppColors.infoText,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Choose a local demonstration result. This is not a real manager decision.',
                          style: AppTypography.small(
                            color: AppColors.infoText,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Row(
                          children: [
                            Expanded(
                              child: EmployeePrimaryButton(
                                label: 'Approve',
                                backgroundColor: AppColors.success,
                                onPressed: () =>
                                    features.simulateAddressDecision(
                                  request['id'].toString(),
                                  true,
                                ),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: EmployeeDangerButton(
                                label: 'Reject',
                                onPressed: () =>
                                    features.simulateAddressDecision(
                                  request['id'].toString(),
                                  false,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ],
              const SizedBox(height: AppSpacing.xxl),
              Text(
                'Address request history',
                style: AppTypography.h4(
                  color: p.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              if (features.addressRequests.isEmpty)
                const EmployeeEmptyState(
                  icon: Icons.location_on_outlined,
                  title: 'No address requests',
                  description:
                      'Your registered address has no submitted change requests.',
                )
              else
                for (final request
                    in features.addressRequests.reversed) ...[
                  AddressRequestHistoryCard(request: request),
                  const SizedBox(height: AppSpacing.sm),
                ],
            ],
          ),
        ),
      ),
    );
  }
}
