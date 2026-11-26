import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../shared/components/components.dart';
import '../../state/employee_feature_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../theme/employee_palette.dart';

class MyNoShowsScreen extends StatefulWidget {
  const MyNoShowsScreen({super.key});

  @override
  State<MyNoShowsScreen> createState() => _MyNoShowsScreenState();
}

class _MyNoShowsScreenState extends State<MyNoShowsScreen> {
  final _reasonController = TextEditingController();
  String? _validationError;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _openReactivationSheet(
    EmployeeFeatureProvider features,
  ) async {
    _reasonController.clear();
    _validationError = null;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheetState) => AppBottomSheet(
          title: 'Request Reactivation',
          subtitle: 'No-Show transportation access',
          child: Padding(
            padding: const EdgeInsets.only(
              bottom: AppSpacing.xl,
              top: AppSpacing.sm,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Explain why transportation access should be reactivated. A real manager approval workflow is not connected in this frontend demonstration.',
                  style: AppTypography.small(
                    color: EmployeePalette.of(sheetContext).textSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                TextField(
                  controller: _reasonController,
                  minLines: 4,
                  maxLines: 6,
                  maxLength: 300,
                  decoration: const InputDecoration(
                    labelText: 'Reason',
                    hintText: 'Describe the situation and your plan to avoid future No-Shows.',
                  ),
                ),
                if (_validationError != null) ...[
                  Text(
                    _validationError!,
                    style: AppTypography.caption(color: AppColors.error),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],
                EmployeePrimaryButton(
                  label: 'Submit Request',
                  icon: Icons.send_rounded,
                  onPressed: () async {
                    if (_reasonController.text.trim().length < 10) {
                      setSheetState(() {
                        _validationError =
                            'Please enter at least 10 characters.';
                      });
                      return;
                    }
                    await features.submitReactivation(
                      _reasonController.text.trim(),
                    );
                    if (!sheetContext.mounted) return;
                    Navigator.of(sheetContext).pop();
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                EmployeeSecondaryButton(
                  label: 'Cancel',
                  onPressed: () => Navigator.of(sheetContext).pop(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final features = context.watch<EmployeeFeatureProvider>();

    if (features.isLoading) {
      return const EmployeeLoadingScaffold(
        appBar: EmployeeAppBar(title: 'My No-Shows'),
        skeletonLayout: SkeletonLayout.analytics,
      );
    }

    final count = features.noShowCount;
    final status = features.reactivationStatus;

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'My No-Shows'),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {},
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.pageHorizontal,
              AppSpacing.lg,
              AppSpacing.pageHorizontal,
              AppSpacing.xxxl,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FeatureSectionCard(
                  padding: const EdgeInsets.all(AppSpacing.xl),
                  child: Row(
                    children: [
                      Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          color: count == 0
                              ? AppColors.success.withAlpha(32)
                              : count == 1
                                  ? AppColors.starAmber.withAlpha(38)
                                  : count == 2
                                      ? AppColors.brandOrange.withAlpha(38)
                                      : AppColors.error.withAlpha(38),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            '$count / 3',
                            style: AppTypography.h3(
                              color: count >= 3
                                  ? AppColors.error
                                  : p.textPrimary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Current No-Show count',
                              style: AppTypography.small(
                                color: p.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$count of 3',
                              style: AppTypography.h2(
                                color: p.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                NoShowProgress(count: count),
                const SizedBox(height: AppSpacing.lg),
                NoShowStatusCard(count: count),
                const SizedBox(height: AppSpacing.xxl),
                Text(
                  'Five-minute waiting policy',
                  style: AppTypography.h4(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                FeatureSectionCard(
                  child: Text(
                    'A No-Show is recorded only after the applicable five-minute waiting period at the scheduled pickup or logout location. Morning Pickup and Evening Logout both contribute to the same count. Opening this page or its icon never creates a No-Show.',
                    style: AppTypography.small(color: p.textSecondary),
                  ),
                ),
                if (count >= 3) ...[
                  const SizedBox(height: AppSpacing.xxl),
                  FeatureSectionCard(
                    borderColor: AppColors.error.withAlpha(130),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(
                              Icons.block_rounded,
                              color: AppColors.error,
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Text(
                                'Transportation Access Blocked',
                                style: AppTypography.h4(
                                  color: p.textPrimary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'Current count: $count. Future transportation trips are restricted. You can still use the rest of the app.',
                          style: AppTypography.small(
                            color: p.textSecondary,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        if (status == 'PENDING')
                          const RequestStatusBadge(status: 'Pending Approval')
                        else if (status == 'REJECTED')
                          const RequestStatusBadge(status: 'Rejected')
                        else if (status == 'APPROVED')
                          const RequestStatusBadge(status: 'Approved')
                        else
                          EmployeePrimaryButton(
                            label: 'Request Reactivation',
                            icon: Icons.restart_alt_rounded,
                            onPressed: () => _openReactivationSheet(features),
                          ),
                        if (status == 'PENDING') ...[
                          const SizedBox(height: AppSpacing.md),
                          Text(
                            'Frontend simulation — choose a local demonstration result:',
                            style: AppTypography.caption(
                              color: p.textMuted,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Row(
                            children: [
                              Expanded(
                                child: EmployeePrimaryButton(
                                  label: 'Approve',
                                  backgroundColor: AppColors.success,
                                  onPressed: () =>
                                      features.simulateReactivationDecision(true),
                                ),
                              ),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(
                                child: EmployeeDangerButton(
                                  label: 'Reject',
                                  onPressed: () =>
                                      features.simulateReactivationDecision(false),
                                ),
                              ),
                            ],
                          ),
                        ],
                        if (status == 'APPROVED') ...[
                          const SizedBox(height: AppSpacing.sm),
                          Text(
                            'Approved in this frontend simulation. Access has been restored and the active count reset to zero.',
                            style: AppTypography.small(
                              color: AppColors.success,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                        if (status == 'REJECTED') ...[
                          const SizedBox(height: AppSpacing.md),
                          EmployeePrimaryButton(
                            label: 'Submit Another Request',
                            onPressed: () => _openReactivationSheet(features),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.xxl),
                Text(
                  'No-Show history',
                  style: AppTypography.h4(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                if (features.noShowHistory.isEmpty)
                  featureEmptyNoShows
                else
                  for (final record in features.noShowHistory.reversed) ...[
                    NoShowHistoryCard(record: record),
                    const SizedBox(height: AppSpacing.sm),
                  ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
