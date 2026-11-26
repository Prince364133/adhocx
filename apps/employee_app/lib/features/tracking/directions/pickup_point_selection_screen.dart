import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../shared/components/components.dart';
import '../../../state/employee_feature_provider.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../../../theme/employee_palette.dart';

class PickupPointSelectionScreen extends StatelessWidget {
  const PickupPointSelectionScreen({super.key});

  Future<void> _confirm(
    BuildContext context,
    EmployeeFeatureProvider features,
  ) async {
    await features.confirmPickupPoint();
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          features.confirmedPickupPointId == features.selectedPickupPointId
              ? 'Pickup point selection saved successfully.'
              : 'Pickup point saved.',
        ),
        backgroundColor: AppColors.success,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final features = context.watch<EmployeeFeatureProvider>();

    if (features.isLoading) {
      return const EmployeeLoadingScaffold(
        appBar: EmployeeAppBar(title: 'Select Pickup Point'),
        skeletonLayout: SkeletonLayout.map,
      );
    }

    final selected = features.selectedPickupPoint;
    final confirmed = features.confirmedPickupPoint;
    final points = features.nearbyPickupPoints;

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Select Pickup Point'),
      body: SafeArea(
        child: points.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.xl),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.location_off_rounded,
                        size: 42,
                        color: p.textMuted,
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        'No nearby pickup points available',
                        textAlign: TextAlign.center,
                        style: AppTypography.h4(
                          color: p.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Try again later or use your registered pickup location.',
                        textAlign: TextAlign.center,
                        style: AppTypography.small(
                          color: p.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      EmployeeSecondaryButton(
                        label: 'Go Back',
                        onPressed: () => Navigator.of(context).maybePop(),
                      ),
                    ],
                  ),
                ),
              )
            : LayoutBuilder(
                builder: (context, constraints) {
                  final wide = constraints.maxWidth >= 760;
                  final map = _MockPickupMap(
                    points: points,
                    selectedId: features.selectedPickupPointId,
                    onSelected: features.selectPickupPoint,
                  );
                  final list = ListView.separated(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.pageHorizontal,
                      AppSpacing.md,
                      AppSpacing.pageHorizontal,
                      AppSpacing.xl,
                    ),
                    itemCount: points.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final point = points[index];
                      final isSelected =
                          features.selectedPickupPointId == point.id;
                      return FeatureSectionCard(
                        padding: EdgeInsets.zero,
                        borderColor: isSelected
                            ? AppColors.deepPurple
                            : p.border,
                        child: InkWell(
                          onTap: () => features.selectPickupPoint(point.id),
                          borderRadius: AppRadius.borderLg,
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            child: Row(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 42,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.lightLavender
                                        : p.surfaceElevated,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    Icons.location_on_rounded,
                                    color: isSelected
                                        ? AppColors.deepPurple
                                        : p.textSecondary,
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        point.name,
                                        style:
                                            AppTypography.bodyMedium(
                                          color: p.textPrimary,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        point.description,
                                        style: AppTypography.caption(
                                          color: p.textSecondary,
                                        ),
                                      ),
                                      const SizedBox(height: AppSpacing.xs),
                                      Text(
                                        '${point.landmark} • ${point.distance}',
                                        style: AppTypography.caption(
                                          color: p.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                Icon(
                                  isSelected
                                      ? Icons.check_circle_rounded
                                      : Icons.radio_button_unchecked,
                                  color: isSelected
                                      ? AppColors.brightPurple
                                      : p.textMuted,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  );

                  final content = wide
                      ? Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: Padding(
                                padding: const EdgeInsets.all(
                                  AppSpacing.pageHorizontal,
                                ),
                                child: map,
                              ),
                            ),
                            SizedBox(
                              width: 390,
                              child: list,
                            ),
                          ],
                        )
                      : Column(
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(
                                AppSpacing.pageHorizontal,
                                AppSpacing.md,
                                AppSpacing.pageHorizontal,
                                0,
                              ),
                              child: map,
                            ),
                            Expanded(child: list),
                          ],
                        );

                  return Column(
                    children: [
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.pageHorizontal,
                          vertical: AppSpacing.sm,
                        ),
                        color: AppColors.softLavender,
                        child: Row(
                          children: [
                            const Icon(
                              Icons.info_outline_rounded,
                              size: 18,
                              color: AppColors.deepPurple,
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Text(
                                'Alternative pickup locations are demonstrations. Your registered residential address will not change.',
                                style: AppTypography.caption(
                                  color: AppColors.deepPurple,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(child: content),
                      if (selected != null)
                        Container(
                          width: double.infinity,
                          padding: EdgeInsets.fromLTRB(
                            AppSpacing.pageHorizontal,
                            AppSpacing.md,
                            AppSpacing.pageHorizontal,
                            AppSpacing.md +
                                MediaQuery.of(context).padding.bottom,
                          ),
                          decoration: BoxDecoration(
                            color: p.surface,
                            border: Border(
                              top: BorderSide(color: p.border),
                            ),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      selected.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style:
                                          AppTypography.bodyMedium(
                                        color: p.textPrimary,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      '${selected.landmark} • ${selected.distance}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTypography.caption(
                                        color: p.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: AppSpacing.md),
                              SizedBox(
                                width: 150,
                                child: EmployeePrimaryButton(
                                  label: confirmed == selected
                                      ? 'Update Selection'
                                      : 'Confirm Selection',
                                  icon: Icons.check_rounded,
                                  onPressed: () =>
                                      _confirm(context, features),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  );
                },
              ),
      ),
    );
  }
}

class _MockPickupMap extends StatelessWidget {
  final List<PickupPointOption> points;
  final String? selectedId;
  final ValueChanged<String> onSelected;

  const _MockPickupMap({
    required this.points,
    required this.selectedId,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return Container(
      height: 220,
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: p.surfaceElevated,
        borderRadius: AppRadius.borderXxl,
        border: Border.all(color: p.border),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          CustomPaint(
            painter: _MapPlaceholderPainter(
              roadColor: p.borderSubtle,
              landColor: p.surfaceElevated,
            ),
          ),
          Positioned(
            left: 180,
            top: 128,
            child: Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: AppColors.deepPurple,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.deepPurple.withAlpha(80),
                    blurRadius: 10,
                  ),
                ],
              ),
            ),
          ),
          for (final point in points)
            Positioned(
              left: point.x * 520 - 18,
              top: point.y * 220 - 18,
              child: Semantics(
                button: true,
                label: point.name,
                child: GestureDetector(
                  onTap: () => onSelected(point.id),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    width: selectedId == point.id ? 44 : 36,
                    height: selectedId == point.id ? 44 : 36,
                    decoration: BoxDecoration(
                      color: selectedId == point.id
                          ? AppColors.brightPurple
                          : p.surface,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: selectedId == point.id
                            ? Colors.white
                            : AppColors.brightPurple,
                        width: selectedId == point.id ? 3 : 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.brightPurple.withAlpha(55),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                    child: Icon(
                      Icons.location_on_rounded,
                      size: selectedId == point.id ? 24 : 20,
                      color: selectedId == point.id
                          ? Colors.white
                          : AppColors.brightPurple,
                    ),
                  ),
                ),
              ),
            ),
          Positioned(
            left: 12,
            bottom: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.xs,
              ),
              decoration: BoxDecoration(
                color: p.surface,
                borderRadius: AppRadius.borderMd,
                border: Border.all(color: p.border),
              ),
              child: Text(
                'Approximate registered location',
                style: AppTypography.caption(
                  color: p.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapPlaceholderPainter extends CustomPainter {
  final Color roadColor;
  final Color landColor;

  const _MapPlaceholderPainter({
    required this.roadColor,
    required this.landColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = landColor;
    canvas.drawRect(Offset.zero & size, paint);

    final road = Paint()
      ..color = roadColor
      ..strokeWidth = 12
      ..style = PaintingStyle.stroke;
    final path = Path()
      ..moveTo(-10, size.height * 0.72)
      ..quadraticBezierTo(
        size.width * 0.35,
        size.height * 0.55,
        size.width,
        size.height * 0.70,
      );
    canvas.drawPath(path, road);

    final vertical = Paint()
      ..color = roadColor
      ..strokeWidth = 9
      ..style = PaintingStyle.stroke;
    final verticalPath = Path()
      ..moveTo(size.width * 0.48, -10)
      ..quadraticBezierTo(
        size.width * 0.40,
        size.height * 0.5,
        size.width * 0.52,
        size.height + 10,
      );
    canvas.drawPath(verticalPath, vertical);
  }

  @override
  bool shouldRepaint(covariant _MapPlaceholderPainter oldDelegate) =>
      roadColor != oldDelegate.roadColor ||
      landColor != oldDelegate.landColor;
}
