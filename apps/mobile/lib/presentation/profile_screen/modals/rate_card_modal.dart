import 'package:flutter/material.dart';
import '../../../services/driver_service.dart';
import '../../../shared/theme/app_colors.dart';

class _ModalShell extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final Widget child;

  const _ModalShell({
    required this.title,
    required this.icon,
    required this.iconColor,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            width: 1.2,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Top drag handle
          Center(
            child: Container(
              width: 38,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Row(
            children: [
              Icon(icon, color: iconColor, size: 20),
              const SizedBox(width: 10),
              Text(
                title,
                style: TextStyle(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}

class RateCardModal extends StatefulWidget {
  const RateCardModal({super.key});

  @override
  State<RateCardModal> createState() => _RateCardModalState();
}

class _RateCardModalState extends State<RateCardModal> {
  bool _isLoading = true;
  List<dynamic> _tiers = [];

  @override
  void initState() {
    super.initState();
    _loadPricingTiers();
  }

  Future<void> _loadPricingTiers() async {
    try {
      final res = await DriverService.instance.getPricingTiers(forceRefresh: true);
      if (mounted) {
        setState(() {
          _tiers = res;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return _ModalShell(
      title: 'Driver Rate Card & Tariffs',
      icon: Icons.speed_rounded,
      iconColor: AppColors.info,
      child: _isLoading
          ? const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 32.0),
                child: CircularProgressIndicator(),
              ),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_tiers.isEmpty) ...[
                  Text(
                    'Standard marketplace rate cards apply to all fulfilled trips.',
                    style: TextStyle(
                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      fontSize: 13,
                    ),
                  ),
                ] else ...[
                  ..._tiers.map((tier) {
                    final map = tier is Map ? tier : <String, dynamic>{};
                    final label = map['categoryLabel'] ?? map['vehicleType'] ?? 'Vehicle';
                    final baseFare = map['baseFare']?.toString() ?? '800';
                    final baseKm = map['baseKm']?.toString() ?? '40';
                    final perKm = map['perKmRate']?.toString() ?? '14.5';
                    final driverShare = map['driverSharePercent']?.toString() ?? '90';
                    final seating = map['seatingCapacity'] ?? 'Commercial Fleet';

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16.0),
                      child: _slabTable(
                        context: context,
                        title: '🚗 $label ($seating)',
                        rows: [
                          ['Base Fare (Up to $baseKm km)', '₹$baseFare'],
                          ['Per Km Rate (After base km)', '₹$perKm/km'],
                          ['Driver Earnings Share', '$driverShare% Net'],
                          ['Platform Fee Floor', '${map['platformFeePercent'] ?? 10}%'],
                        ],
                      ),
                    );
                  }),
                ],
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: isDark ? 0.15 : 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: isDark ? 0.35 : 0.25),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.verified_rounded,
                        color: AppColors.primary,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Direct marketplace payout guaranteed into driver wallet upon trip completion.',
                          style: TextStyle(
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _slabTable({
    required BuildContext context,
    required String title,
    required List<List<String>> rows,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
            ),
          ),
          child: Column(
            children: rows.asMap().entries.map((entry) {
              final i = entry.key;
              final row = entry.value;
              return Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          row[0],
                          style: TextStyle(
                            color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          row[1],
                          style: TextStyle(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (i < rows.length - 1)
                    Divider(
                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      height: 1,
                    ),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}
