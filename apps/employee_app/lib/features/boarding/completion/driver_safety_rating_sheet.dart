import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/features/trips/summary/driver_rating_trip.dart';
import 'package:adhocx_employee/repositories/http_employee_rider_repository.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

Future<bool?> showDriverSafetyRatingSheet(
  BuildContext context,
  DriverRatingTrip trip,
) {
  if (!trip.canRate) {
    throw ArgumentError.value(trip.stopId, 'trip', 'Trip is not rateable');
  }

  final p = EmployeePalette.of(context);
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    barrierColor: p.textPrimary.withAlpha(96),
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(
        top: Radius.circular(AppRadius.xxl),
      ),
    ),
    builder: (_) => _DriverSafetyRatingSheet(trip: trip),
  );
}

class _DriverSafetyRatingSheet extends StatefulWidget {
  final DriverRatingTrip trip;

  const _DriverSafetyRatingSheet({required this.trip});

  @override
  State<_DriverSafetyRatingSheet> createState() =>
      _DriverSafetyRatingSheetState();
}

class _DriverSafetyRatingSheetState extends State<_DriverSafetyRatingSheet> {
  bool? _feltSafe;
  int _rating = 0;
  bool _isSubmitting = false;
  String? _error;

  Future<void> _submit() async {
    if (_feltSafe == null || _rating == 0 || _isSubmitting) return;

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      await context.read<HttpEmployeeRiderRepository>().submitFeedback(
            widget.trip.stopId,
            rating: _rating,
            feltSafe: _feltSafe,
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (mounted) setState(() => _error = 'Unable to submit rating: $error');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Widget _driverAvatar(EmployeePalette palette) {
    final photoUrl = widget.trip.driverPhotoUrl;
    return CircleAvatar(
      radius: 32,
      backgroundColor: palette.accentTint,
      child: ClipOval(
        child: photoUrl == null || photoUrl.isEmpty
            ? Icon(Icons.person_rounded, color: palette.accent, size: 38)
            : Image.network(
                photoUrl,
                width: 64,
                height: 64,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Icon(
                  Icons.person_rounded,
                  color: palette.accent,
                  size: 38,
                ),
              ),
      ),
    );
  }

  Widget _safetyOption({
    required EmployeePalette palette,
    required String label,
    required bool selected,
    required bool value,
  }) {
    return Expanded(
      child: InkWell(
        onTap: _isSubmitting
            ? null
            : () => setState(() {
                  _feltSafe = value;
                  _error = null;
                }),
        borderRadius: AppRadius.borderPill,
        child: Container(
          constraints: const BoxConstraints(minHeight: 46),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          decoration: BoxDecoration(
            color: selected ? palette.accentTint : palette.surface,
            borderRadius: AppRadius.borderPill,
            border: Border.all(
              color: selected ? palette.accent : palette.border,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: AppTypography.bodyMedium(
              color: selected ? palette.accent : palette.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final driverRating = widget.trip.driverRating;

    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppRadius.xxl),
        ),
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.pageHorizontal,
            AppSpacing.md,
            AppSpacing.pageHorizontal,
            AppSpacing.xl + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: p.borderSubtle,
                    borderRadius: AppRadius.borderPill,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Icon(Icons.shield_rounded, color: p.accent, size: 20),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Your feedback helps other women',
                      style: AppTypography.caption(
                        color: p.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  _driverAvatar(p),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.trip.driverName.isEmpty
                              ? 'Your driver'
                              : widget.trip.driverName,
                          style: AppTypography.h4(
                            color: p.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        if (driverRating != null)
                          Row(
                            children: [
                              const Icon(
                                Icons.star_rounded,
                                color: AppColors.starAmber,
                                size: 17,
                              ),
                              const SizedBox(width: AppSpacing.xs),
                              Text(
                                driverRating.toStringAsFixed(1),
                                style: AppTypography.caption(
                                  color: p.textSecondary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        if (widget.trip.vehicleModel.isNotEmpty ||
                            widget.trip.vehiclePlate.isNotEmpty)
                          Text(
                            [widget.trip.vehicleModel, widget.trip.vehiclePlate]
                                .where((value) => value.isNotEmpty)
                                .join(' • '),
                            style: AppTypography.caption(color: p.textMuted),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              Text(
                'Did this driver make you feel safe?',
                style: AppTypography.h4(
                  color: p.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  _safetyOption(
                    palette: p,
                    label: 'Yes, I felt safe!',
                    selected: _feltSafe == true,
                    value: true,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _safetyOption(
                    palette: p,
                    label: 'No',
                    selected: _feltSafe == false,
                    value: false,
                  ),
                ],
              ),
              Divider(color: p.border, height: AppSpacing.xxl),
              Text(
                'How was your ride?',
                style: AppTypography.h4(
                  color: p.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  final rating = index + 1;
                  return IconButton(
                    tooltip: 'Rate $rating ${rating == 1 ? 'star' : 'stars'}',
                    onPressed: _isSubmitting
                        ? null
                        : () => setState(() {
                              _rating = rating;
                              _error = null;
                            }),
                    icon: Icon(
                      rating <= _rating
                          ? Icons.star_rounded
                          : Icons.star_border_rounded,
                      color: AppColors.starAmber,
                      size: 34,
                    ),
                  );
                }),
              ),
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  _error!,
                  style: AppTypography.caption(color: AppColors.error),
                  textAlign: TextAlign.center,
                ),
              ],
              const SizedBox(height: AppSpacing.md),
              EmployeePrimaryButton(
                label: 'Submit',
                isLoading: _isSubmitting,
                onPressed: _feltSafe == null || _rating == 0 || _isSubmitting
                    ? null
                    : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
