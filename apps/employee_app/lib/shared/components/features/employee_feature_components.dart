import 'package:flutter/material.dart';

import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../../../theme/employee_palette.dart';
import '../feedback/employee_empty_state.dart';

class RequestStatusBadge extends StatelessWidget {
  final String status;

  const RequestStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final normalized = status.toUpperCase();
    final isApproved = normalized == 'APPROVED';
    final isRejected = normalized == 'REJECTED';
    final isPending = normalized == 'PENDING';
    final color = isApproved
        ? AppColors.success
        : isRejected
            ? AppColors.error
            : isPending
                ? AppColors.warning
                : AppColors.info;
    final label = normalized.isEmpty ? 'Unknown' : _title(normalized);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: color.withAlpha(38),
        borderRadius: AppRadius.borderPill,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isApproved
                ? Icons.check_circle_rounded
                : isRejected
                    ? Icons.cancel_rounded
                    : isPending
                        ? Icons.schedule_rounded
                        : Icons.info_outline_rounded,
            size: 14,
            color: color,
          ),
          const SizedBox(width: AppSpacing.xs),
          Text(
            label,
            style: AppTypography.caption(
              color: color,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  static String _title(String value) =>
      value.toLowerCase().replaceAll('_', ' ').split(' ').map((word) {
        if (word.isEmpty) return word;
        return '${word[0].toUpperCase()}${word.substring(1)}';
      }).join(' ');
}

class FeatureSectionCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? borderColor;

  const FeatureSectionCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.borderLg,
        border: Border.all(
          color: borderColor ?? p.border,
          width: borderColor == null ? 1 : 1.2,
        ),
      ),
      child: child,
    );
  }
}

class NoShowProgress extends StatelessWidget {
  final int count;

  const NoShowProgress({super.key, required this.count});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final stages = [
      (
        'First No-Show',
        'Warning',
        AppColors.starAmber,
        'You have received your first No-Show.'
      ),
      (
        'Second No-Show',
        'Important Warning',
        AppColors.brandOrange,
        'One more No-Show will restrict transportation.'
      ),
      (
        'Third No-Show',
        'Critical',
        AppColors.error,
        'Future transportation access has been blocked.'
      ),
    ];

    return FeatureSectionCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.xl,
      ),
      child: Column(
        children: [
          for (var i = 0; i < stages.length; i++) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 320),
                      curve: Curves.easeOutCubic,
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: i < count
                            ? stages[i].$3
                            : p.surfaceElevated,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: i < count
                              ? stages[i].$3
                              : p.border,
                          width: i < count ? 3 : 1,
                        ),
                        boxShadow: i < count && !MediaQuery.disableAnimationsOf(context)
                            ? [
                                BoxShadow(
                                  color: stages[i].$3.withAlpha(70),
                                  blurRadius: 12,
                                  spreadRadius: 3,
                                ),
                              ]
                            : null,
                      ),
                      child: Center(
                        child: Text(
                          '${i + 1}',
                          style: AppTypography.h4(
                            color: i < count ? Colors.white : p.textMuted,
                          ),
                        ),
                      ),
                    ),
                    if (i < stages.length - 1)
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 320),
                        width: 3,
                        height: 50,
                        color: i < count ? stages[i].$3 : p.border,
                      ),
                  ],
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.xs),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stages[i].$1,
                          style: AppTypography.bodyMedium(
                            color: i < count ? stages[i].$3 : p.textSecondary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          stages[i].$2,
                          style: AppTypography.caption(
                            color: p.textMuted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          i < count ? stages[i].$4 : 'Inactive',
                          style: AppTypography.small(
                            color: i < count
                                ? p.textPrimary
                                : p.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class NoShowStatusCard extends StatelessWidget {
  final int count;

  const NoShowStatusCard({super.key, required this.count});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final c = count.clamp(0, 3);
    final data = switch (c) {
      0 => (
          'Excellent!',
          'No recorded No-Shows. Keep maintaining your schedule.',
          'Transportation Active',
          AppColors.success,
        ),
      1 => (
          'First Warning',
          'You have one recorded No-Show. Please ensure you are available for your scheduled trip.',
          'Transportation Active',
          AppColors.starAmber,
        ),
      2 => (
          'Important Warning',
          'You have two recorded No-Shows. One more No-Show will restrict your future transportation access.',
          'Transportation Active',
          AppColors.brandOrange,
        ),
      _ => (
          'Transportation Access Blocked',
          'Your future transportation services are restricted. Please submit a reactivation request for manager approval.',
          'Transportation Blocked',
          AppColors.error,
        ),
    };

    return FeatureSectionCard(
      borderColor: data.$4.withAlpha(120),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: data.$4.withAlpha(p.isDark ? 55 : 32),
              borderRadius: AppRadius.borderLg,
            ),
            child: Icon(
              c >= 3 ? Icons.block_rounded : Icons.warning_amber_rounded,
              color: data.$4,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data.$1,
                  style: AppTypography.h4(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  data.$2,
                  style: AppTypography.small(color: p.textSecondary),
                ),
                const SizedBox(height: AppSpacing.sm),
                RequestStatusBadge(status: data.$3),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class NoShowHistoryCard extends StatelessWidget {
  final Map<String, dynamic> record;

  const NoShowHistoryCard({super.key, required this.record});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final number = record['number']?.toString() ?? '';
    final date = record['date']?.toString() ?? '';
    final time = record['time']?.toString() ?? '';
    final tripType = record['tripType']?.toString() ?? '';
    final reference = record['tripReference']?.toString() ?? '';

    return FeatureSectionCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.error.withAlpha(p.isDark ? 55 : 32),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.event_busy_rounded,
              size: 20,
              color: AppColors.error,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'No-Show $number',
                  style: AppTypography.bodyMedium(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '$tripType • $date${time.isEmpty ? '' : ' • $time'}',
                  style: AppTypography.small(color: p.textSecondary),
                ),
                if (reference.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Trip: $reference',
                    style: AppTypography.caption(color: p.textMuted),
                  ),
                ],
              ],
            ),
          ),
          RequestStatusBadge(status: record['status']?.toString() ?? 'Confirmed'),
        ],
      ),
    );
  }
}

class AddressRequestHistoryCard extends StatelessWidget {
  final Map<String, dynamic> request;

  const AddressRequestHistoryCard({super.key, required this.request});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final status = request['status']?.toString() ?? 'Pending';
    return FeatureSectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Request: ${request['requestDate']?.toString() ?? ''}',
                  style: AppTypography.bodyMedium(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              RequestStatusBadge(status: status),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text('Previous address',
              style: AppTypography.caption(color: p.textMuted)),
          Text(
            request['previousAddress']?.toString() ?? '',
            style: AppTypography.small(color: p.textPrimary),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text('Proposed address',
              style: AppTypography.caption(color: p.textMuted)),
          Text(
            request['proposedAddress']?.toString() ?? '',
            style: AppTypography.small(color: p.textPrimary),
          ),
          if (request['remarks']?.toString().isNotEmpty == true) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Frontend simulation remark: ${request['remarks']}',
              style: AppTypography.caption(
                color: p.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

const featureEmptyNoShows = EmployeeEmptyState(
  icon: Icons.event_available_rounded,
  title: 'No No-Shows recorded. You’re all set!',
  description: 'You can continue using your transportation services.',
);
