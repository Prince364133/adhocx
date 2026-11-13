import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Loads mock trip data once and shows the shared loading screen meanwhile.
class TripDataBuilder extends StatefulWidget {
  final Future<Map<String, dynamic>?> Function() load;
  final Widget Function(BuildContext context, Map<String, dynamic> data)
      builder;

  const TripDataBuilder({super.key, required this.load, required this.builder});

  @override
  State<TripDataBuilder> createState() => _TripDataBuilderState();
}

class _TripDataBuilderState extends State<TripDataBuilder> {
  late final Future<Map<String, dynamic>?> _future = widget.load();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>?>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const EmployeeLoadingScaffold();
        }
        return widget.builder(context, snapshot.data ?? const {});
      },
    );
  }
}

/// Page shell for every trip stage screen (Planning → Completed):
/// app bar, centred h2 title, status badge, then [children] in a scrolling
/// column. Driver tokens; light/dark aware.
class TripStageScaffold extends StatelessWidget {
  final String title;
  final String statusLabel;
  final BadgeVariant statusVariant;
  final List<Widget> children;

  /// Align children to the start (lists, timelines) instead of the centre.
  final bool alignStart;

  const TripStageScaffold({
    super.key,
    required this.title,
    required this.statusLabel,
    required this.statusVariant,
    required this.children,
    this.alignStart = false,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.xxl,
            AppSpacing.sm,
            AppSpacing.xxl,
            AppSpacing.xxl,
          ),
          child: Column(
            crossAxisAlignment: alignStart
                ? CrossAxisAlignment.stretch
                : CrossAxisAlignment.center,
            children: [
              Text(
                title,
                textAlign: TextAlign.center,
                style: AppTypography.h2(color: p.textPrimary),
              ),
              const SizedBox(height: AppSpacing.md),
              Center(
                child: EmployeeStatusBadge(
                  label: statusLabel,
                  variant: statusVariant,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md + 2,
                    vertical: AppSpacing.xs + 2,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              ...children,
            ],
          ),
        ),
      ),
    );
  }
}

/// Centred headline + supporting line ("Your cab has arrived!").
class TripHeadline extends StatelessWidget {
  final String title;
  final String? subtitle;

  const TripHeadline({super.key, required this.title, this.subtitle});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return Column(
      children: [
        Text(
          title,
          textAlign: TextAlign.center,
          style: AppTypography.h2(color: p.textPrimary, overflow: null),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: AppSpacing.xs + 2),
          Text(
            subtitle!,
            textAlign: TextAlign.center,
            style: AppTypography.body(color: p.textSecondary),
          ),
        ],
      ],
    );
  }
}

/// Compact driver row: avatar, name, rating, optional plate, and a working
/// call button (opens the contact-driver sheet).
class TripDriverRow extends StatelessWidget {
  final String name;
  final String rating;
  final String? vehicleNumber;
  final double avatarRadius;

  const TripDriverRow({
    super.key,
    required this.name,
    required this.rating,
    this.vehicleNumber,
    this.avatarRadius = 24,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return AppCard(
      width: double.infinity,
      child: Row(
        children: [
          CircleAvatar(
            radius: avatarRadius,
            backgroundColor: p.accentTint,
            child: Icon(Icons.person, color: p.accent, size: avatarRadius * 1.15),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  style: AppTypography.h4(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    const Icon(Icons.star_rounded,
                        color: AppColors.starAmber, size: 16),
                    const SizedBox(width: AppSpacing.xs),
                    Flexible(
                      child: Text(
                        rating,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.caption(
                          color: p.textSecondary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (vehicleNumber != null) ...[
                      const SizedBox(width: AppSpacing.md),
                      Flexible(
                        child: Text(
                          vehicleNumber!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.caption(
                            color: p.accent,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          EmployeeIconButton(
            icon: Icons.phone,
            tooltip: 'Call driver',
            backgroundColor: p.accentTint,
            iconColor: p.accent,
            onPressed: () => context.push(AppRoutes.contactDriverSheet),
          ),
        ],
      ),
    );
  }
}

/// Vehicle summary card: car icon tile, model, plate, colour • capacity.
class TripVehicleCard extends StatelessWidget {
  final String model;
  final String plate;
  final String details;

  const TripVehicleCard({
    super.key,
    required this.model,
    required this.plate,
    required this.details,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return AppCard(
      width: double.infinity,
      backgroundColor: p.surfaceElevated,
      child: Row(
        children: [
          Container(
            width: 56,
            height: 48,
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: AppRadius.borderLg,
              border: Border.all(color: p.border),
            ),
            child: Icon(
              Icons.directions_car_filled_rounded,
              color: p.accent,
              size: 30,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  model,
                  style: AppTypography.h4(
                    color: p.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  plate,
                  style: AppTypography.small(
                    color: p.accent,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(details, style: AppTypography.caption(color: p.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// One labelled value in a [TripInfoCard].
class TripInfoItem {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const TripInfoItem({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });
}

/// Card of icon / label / value rows separated by dividers.
class TripInfoCard extends StatelessWidget {
  final List<TripInfoItem> items;

  const TripInfoCard({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return AppCard(
      width: double.infinity,
      padding: AppSpacing.paddingXl,
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0) Divider(color: p.border, height: AppSpacing.xxl + 4),
            Row(
              children: [
                Icon(items[i].icon, size: 20, color: p.textMuted),
                const SizedBox(width: AppSpacing.md + 2),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        items[i].label,
                        style: AppTypography.micro(color: p.textMuted),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        items[i].value,
                        style: AppTypography.bodyMedium(
                          color: items[i].valueColor ?? p.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
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

/// Destination tile ("Drop at / To Office") with a tinted icon bubble.
class TripDestinationTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const TripDestinationTile({
    super.key,
    required this.label,
    required this.value,
    this.icon = Icons.apartment_rounded,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.sm + 2),
          decoration: BoxDecoration(color: p.accentTint, shape: BoxShape.circle),
          child: Icon(icon, color: p.accent, size: 22),
        ),
        const SizedBox(width: AppSpacing.md + 2),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: AppTypography.caption(
                  color: p.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                value,
                style: AppTypography.h4(
                  color: p.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Read-only boarding OTP shown as one box per digit.
class TripOtpDigits extends StatelessWidget {
  final String otp;

  const TripOtpDigits({super.key, required this.otp});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Semantics(
      label: 'Boarding code ${otp.split('').join(' ')}',
      excludeSemantics: true,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (final digit in otp.split(''))
            Flexible(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
                constraints: const BoxConstraints(maxWidth: 40),
                height: 48,
                decoration: BoxDecoration(
                  color: p.surfaceElevated,
                  borderRadius: AppRadius.borderMd,
                  border: Border.all(color: p.accent.withAlpha(77), width: 1.2),
                ),
                alignment: Alignment.center,
                child: Text(
                  digit,
                  style: AppTypography.h2(
                    color: p.accent,
                    fontWeight: FontWeight.w800,
                    overflow: null,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Icon + label on the left, bold value on the right.
class TripMetricRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const TripMetricRow({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Row(
      children: [
        Icon(icon, size: 20, color: p.textSecondary),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Text(
            label,
            style: AppTypography.small(
              color: p.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Text(
          value,
          style: AppTypography.bodyMedium(
            color: p.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

/// Muted information note with a leading info icon.
class TripInfoNote extends StatelessWidget {
  final String text;

  const TripInfoNote({super.key, required this.text});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md + 2),
      decoration: BoxDecoration(
        color: p.surfaceElevated,
        borderRadius: AppRadius.borderLg,
        border: Border.all(color: p.border),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline_rounded, color: p.accent, size: 20),
          const SizedBox(width: AppSpacing.sm + 2),
          Expanded(
            child: Text(
              text,
              style: AppTypography.small(
                color: p.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
