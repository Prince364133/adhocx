import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';

enum SkeletonLayout {
  generic,
  home,
  schedule,
  profile,
  list,
  trip,
  map,
  notifications,
  tickets,
  analytics,
  form,
}

/// Foundation for every Employee App skeleton surface.
class SkeletonBone extends StatefulWidget {
  final double? width;
  final double? height;
  final BorderRadiusGeometry borderRadius;
  final ShapeBorder? shape;

  const SkeletonBone({
    super.key,
    this.width,
    this.height,
    this.borderRadius = const BorderRadius.all(Radius.circular(8)),
    this.shape,
  });

  @override
  State<SkeletonBone> createState() => _SkeletonBoneState();
}

class _SkeletonBoneState extends State<SkeletonBone>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1350),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncMotion(MediaQuery.disableAnimationsOf(context));
  }

  void _syncMotion(bool reduceMotion) {
    if (reduceMotion) {
      _controller.stop();
      _controller.value = 0;
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    if (reduceMotion != _controller.isAnimating) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _syncMotion(reduceMotion);
      });
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final base = isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight;
    final highlight =
        isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final alignment = reduceMotion
            ? Alignment.center
            : Alignment(-1.4 + (_controller.value * 2.8), 0);
        final decoration = BoxDecoration(
          borderRadius:
              widget.shape == null ? widget.borderRadius : null,
          shape: widget.shape is CircleBorder ? BoxShape.circle : BoxShape.rectangle,
          gradient: reduceMotion
              ? LinearGradient(colors: [base, highlight.withAlpha(120), base])
              : LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [base, highlight, base],
                  stops: const [0.0, 0.5, 1.0],
                  transform: _SkeletonGradientTransform(alignment),
                ),
        );

        final bone = Container(
          width: widget.width,
          height: widget.height,
          decoration: decoration,
        );
        return widget.shape == null
            ? bone
            : Container(
                width: widget.width,
                height: widget.height,
                decoration: ShapeDecoration(
                  color: base,
                  shape: widget.shape!,
                ),
                child: ClipPath(
                  clipper: ShapeBorderClipper(shape: widget.shape!),
                  child: bone,
                ),
              );
      },
    );
  }
}

class _SkeletonGradientTransform extends GradientTransform {
  final Alignment alignment;

  const _SkeletonGradientTransform(this.alignment);

  @override
  Matrix4 transform(Rect bounds, {TextDirection? textDirection}) {
    final dx = alignment.x * bounds.width * 0.5;
    return Matrix4.translationValues(dx, 0, 0);
  }
}

class SkeletonText extends StatelessWidget {
  final double? width;
  final double height;
  final BorderRadiusGeometry borderRadius;

  const SkeletonText({
    super.key,
    this.width,
    this.height = 12,
    this.borderRadius =
        const BorderRadius.all(Radius.circular(AppRadius.sm)),
  });

  @override
  Widget build(BuildContext context) =>
      SkeletonBone(width: width, height: height, borderRadius: borderRadius);
}

class SkeletonAvatar extends StatelessWidget {
  final double size;

  const SkeletonAvatar({super.key, this.size = 48});

  @override
  Widget build(BuildContext context) => SkeletonBone(
        width: size,
        height: size,
        shape: const CircleBorder(),
      );
}

class SkeletonCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double? height;

  const SkeletonCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      height: height,
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: AppRadius.borderLg,
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: child,
    );
  }
}

class SkeletonListItem extends StatelessWidget {
  final bool hasTrailing;
  final bool hasAvatar;
  final double height;

  const SkeletonListItem({
    super.key,
    this.hasTrailing = true,
    this.hasAvatar = true,
    this.height = 76,
  });

  @override
  Widget build(BuildContext context) => SkeletonCard(
        padding: const EdgeInsets.all(AppSpacing.md),
        height: height,
        child: Row(
          children: [
            if (hasAvatar) ...[
              const SkeletonAvatar(size: 44),
              const SizedBox(width: AppSpacing.md),
            ],
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SkeletonText(height: 13),
                  SizedBox(height: AppSpacing.sm),
                  SkeletonText(width: 180, height: 10),
                ],
              ),
            ),
            if (hasTrailing) ...[
              const SizedBox(width: AppSpacing.md),
              const SkeletonBone(width: 52, height: 26),
            ],
          ],
        ),
      );
}

class SkeletonButton extends StatelessWidget {
  final double height;

  const SkeletonButton({super.key, this.height = 48});

  @override
  Widget build(BuildContext context) => SkeletonBone(
        width: double.infinity,
        height: height,
        borderRadius: AppRadius.borderMd,
      );
}

class SkeletonContainer extends StatelessWidget {
  final SkeletonLayout layout;

  const SkeletonContainer({super.key, required this.layout});

  @override
  Widget build(BuildContext context) {
    switch (layout) {
      case SkeletonLayout.home:
        return const _HomeSkeleton();
      case SkeletonLayout.schedule:
        return const _ScheduleSkeleton();
      case SkeletonLayout.profile:
        return const _ProfileSkeleton();
      case SkeletonLayout.list:
      case SkeletonLayout.notifications:
      case SkeletonLayout.tickets:
        return const _ListSkeleton();
      case SkeletonLayout.trip:
        return const _TripSkeleton();
      case SkeletonLayout.map:
        return const _MapSkeleton();
      case SkeletonLayout.analytics:
        return const _AnalyticsSkeleton();
      case SkeletonLayout.form:
        return const _FormSkeleton();
      case SkeletonLayout.generic:
        return const _GenericSkeleton();
    }
  }
}

class _ScreenPadding extends StatelessWidget {
  final Widget child;

  const _ScreenPadding({required this.child});

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.pageHorizontal,
          vertical: AppSpacing.lg,
        ),
        child: child,
      );
}

class _GenericSkeleton extends StatelessWidget {
  const _GenericSkeleton();

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) => _ScreenPadding(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SkeletonText(width: 160, height: 20),
              const SizedBox(height: AppSpacing.xl),
              SkeletonCard(
                height: (constraints.maxHeight * 0.22).clamp(150.0, 220.0),
                child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonText(height: 16),
                  SizedBox(height: AppSpacing.md),
                  SkeletonText(height: 12),
                  SizedBox(height: AppSpacing.sm),
                  SkeletonText(width: 220, height: 12),
                ],
              ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const SkeletonListItem(),
              const SizedBox(height: AppSpacing.sm),
              const SkeletonListItem(),
            ],
          ),
        ),
      );
}

class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) => _ScreenPadding(
          child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                SkeletonAvatar(size: 42),
                SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SkeletonText(width: 120, height: 12),
                      SizedBox(height: AppSpacing.xs),
                      SkeletonText(width: 170, height: 18),
                    ],
                  ),
                ),
                SkeletonAvatar(size: 38),
              ],
            ),
            const SizedBox(height: AppSpacing.xxl),
            SkeletonCard(
              padding: const EdgeInsets.all(AppSpacing.xl),
              height: (constraints.maxHeight * 0.32).clamp(220.0, 320.0),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonText(width: 150, height: 16),
                  SizedBox(height: AppSpacing.lg),
                  SkeletonText(height: 18),
                  SizedBox(height: AppSpacing.md),
                  SkeletonText(width: 220, height: 12),
                  Spacer(),
                  SkeletonButton(height: 44),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            const SkeletonListItem(height: 92),
          ],
          ),
        ),
      );
}

class _ScheduleSkeleton extends StatelessWidget {
  const _ScheduleSkeleton();

  @override
  Widget build(BuildContext context) => _ScreenPadding(
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SkeletonText(width: 180, height: 18),
                Spacer(),
                SkeletonBone(width: 72, height: 34),
              ],
            ),
            SizedBox(height: AppSpacing.xl),
            SkeletonCard(
              height: 240,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonText(width: 150, height: 18),
                  SizedBox(height: AppSpacing.xl),
                  SkeletonBone(width: double.infinity, height: 44),
                  SizedBox(height: AppSpacing.sm),
                  SkeletonBone(width: double.infinity, height: 44),
                  Spacer(),
                  SkeletonButton(),
                ],
              ),
            ),
          ],
        ),
      );
}

class _ProfileSkeleton extends StatelessWidget {
  const _ProfileSkeleton();

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        child: Column(
        children: [
          Container(
            width: double.infinity,
            height: 210,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [
                  AppColors.primaryGradientStart,
                  AppColors.primaryGradientEnd,
                ],
              ),
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(AppRadius.xxl),
              ),
            ),
            child: const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SkeletonAvatar(size: 92),
                SizedBox(height: AppSpacing.md),
                SkeletonText(width: 150, height: 16),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.pageHorizontal,
            ),
            child: const Column(
              children: [
                SkeletonCard(
                  height: 210,
                  child: Column(
                    children: [
                      SkeletonListItem(hasTrailing: false),
                      SizedBox(height: AppSpacing.sm),
                      SkeletonListItem(hasTrailing: false),
                    ],
                  ),
                ),
                SizedBox(height: AppSpacing.lg),
                SkeletonListItem(),
                SizedBox(height: AppSpacing.sm),
                SkeletonListItem(),
              ],
            ),
          ),
        ],
        ),
      );
}

class _ListSkeleton extends StatelessWidget {
  const _ListSkeleton();

  @override
  Widget build(BuildContext context) => const _ScreenPadding(
        child: Column(
          children: [
            Row(
              children: [
                SkeletonBone(width: 70, height: 34),
                SizedBox(width: AppSpacing.sm),
                SkeletonBone(width: 84, height: 34),
                SizedBox(width: AppSpacing.sm),
                SkeletonBone(width: 76, height: 34),
              ],
            ),
            SizedBox(height: AppSpacing.xl),
            SkeletonListItem(height: 86),
            SizedBox(height: AppSpacing.sm),
            SkeletonListItem(height: 86),
            SizedBox(height: AppSpacing.sm),
            SkeletonListItem(height: 86),
          ],
        ),
      );
}

class _TripSkeleton extends StatelessWidget {
  const _TripSkeleton();

  @override
  Widget build(BuildContext context) => _ScreenPadding(
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonText(width: 180, height: 18),
            SizedBox(height: AppSpacing.xl),
            SkeletonCard(
              height: 300,
              child: Column(
                children: [
                  SkeletonListItem(hasTrailing: false, height: 68),
                  SizedBox(height: AppSpacing.md),
                  SkeletonListItem(hasTrailing: false, height: 68),
                  SizedBox(height: AppSpacing.md),
                  SkeletonListItem(hasTrailing: false, height: 68),
                ],
              ),
            ),
            SizedBox(height: AppSpacing.xl),
            SkeletonButton(),
          ],
        ),
      );
}

class _MapSkeleton extends StatelessWidget {
  const _MapSkeleton();

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) => _ScreenPadding(
          child: Column(
            children: [
              SkeletonBone(
                width: double.infinity,
                height: (constraints.maxHeight * 0.28).clamp(180.0, 280.0),
                borderRadius: AppRadius.borderXxl,
              ),
              const SizedBox(height: AppSpacing.lg),
              const SkeletonListItem(height: 88),
              const SizedBox(height: AppSpacing.xl),
              const SkeletonButton(),
            ],
          ),
        ),
      );
}

class _AnalyticsSkeleton extends StatelessWidget {
  const _AnalyticsSkeleton();

  @override
  Widget build(BuildContext context) => _ScreenPadding(
        child: const Column(
          children: [
            SkeletonBone(width: double.infinity, height: 44),
            SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(child: SkeletonCard(height: 130, child: SkeletonText(height: 18))),
                SizedBox(width: AppSpacing.md),
                Expanded(child: SkeletonCard(height: 130, child: SkeletonText(height: 18))),
              ],
            ),
            SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(child: SkeletonCard(height: 130, child: SkeletonText(height: 18))),
                SizedBox(width: AppSpacing.md),
                Expanded(child: SkeletonCard(height: 130, child: SkeletonText(height: 18))),
              ],
            ),
            SizedBox(height: AppSpacing.xl),
            SkeletonCard(
              height: 120,
              child: Column(
                children: [
                  SkeletonText(height: 14),
                  SizedBox(height: AppSpacing.lg),
                  SkeletonText(height: 14),
                ],
              ),
            ),
          ],
        ),
      );
}

class _FormSkeleton extends StatelessWidget {
  const _FormSkeleton();

  @override
  Widget build(BuildContext context) => const _ScreenPadding(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonText(width: 180, height: 18),
            SizedBox(height: AppSpacing.xl),
            SkeletonBone(width: double.infinity, height: 56),
            SizedBox(height: AppSpacing.md),
            SkeletonBone(width: double.infinity, height: 56),
            SizedBox(height: AppSpacing.md),
            SkeletonBone(width: double.infinity, height: 56),
            SizedBox(height: AppSpacing.xxl),
            SkeletonButton(),
          ],
        ),
      );
}
