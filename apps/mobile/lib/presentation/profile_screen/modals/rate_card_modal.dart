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
  int _selectedTab = 0; // 0: Corporate Zonal (2026), 1: Marketplace Km/Hr
  String _selectedHub = 'HITEC_NANAKRAMGUDA';
  String _selectedVehicle = 'SEDAN';
  List<dynamic> _tiers = [];

  @override
  void initState() {
    super.initState();
    _loadAllRateCards();
  }

  Future<void> _loadAllRateCards() async {
    try {
      final results = await Future.wait([
        DriverService.instance.getPricingTiers(forceRefresh: true),
        DriverService.instance.getDriverZonalRateCard(forceRefresh: true),
      ]);
      if (mounted) {
        setState(() {
          _tiers = results[0] is List ? results[0] as List : [];
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // Canonical fallback data matching driver.pdf 2026 proposal
  static const Map<String, Map<String, Map<String, dynamic>>> _defaultZonalData = {
    'HITEC_NANAKRAMGUDA': {
      'Extra (E)': {'SEDAN': 425, 'SUV': 595, 'escort': '+₹200 / +₹300'},
      'Zone 6': {'SEDAN': 510, 'SUV': 765, 'escort': '+₹200 / +₹300'},
      'Zone 5': {'SEDAN': 595, 'SUV': 850, 'escort': '+₹300 / +₹400'},
      'Zone 4': {'SEDAN': 680, 'SUV': 935, 'escort': '+₹300 / +₹400'},
      'Zone 3': {'SEDAN': 765, 'SUV': 1020, 'escort': '+₹400 / +₹500'},
      'Zone 2': {'SEDAN': 850, 'SUV': 1105, 'escort': '+₹400 / +₹500'},
      'Zone 1': {'SEDAN': 935, 'SUV': 1190, 'escort': '+₹400 / +₹500'},
    },
    'KOKAPET': {
      'Extra (E)': {'SEDAN': 510, 'SUV': 680, 'escort': '+₹300 / +₹400'},
      'Zone 6': {'SEDAN': 595, 'SUV': 765, 'escort': '+₹300 / +₹400'},
      'Zone 5': {'SEDAN': 680, 'SUV': 935, 'escort': '+₹300 / +₹400'},
      'Zone 4': {'SEDAN': 765, 'SUV': 1020, 'escort': '+₹300 / +₹400'},
      'Zone 3': {'SEDAN': 850, 'SUV': 1105, 'escort': '+₹400 / +₹500'},
      'Zone 2': {'SEDAN': 935, 'SUV': 1190, 'escort': '+₹400 / +₹500'},
      'Zone 1': {'SEDAN': 1020, 'SUV': 1275, 'escort': '+₹400 / +₹500'},
    },
  };

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
                // Segmented Tab Switcher (Corporate Zonal vs Marketplace)
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedTab = 0),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _selectedTab == 0 ? AppColors.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Corporate Zonal 2026',
                              style: TextStyle(
                                color: _selectedTab == 0
                                    ? Colors.white
                                    : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedTab = 1),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _selectedTab == 1 ? AppColors.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Marketplace Km/Hr',
                              style: TextStyle(
                                color: _selectedTab == 1
                                    ? Colors.white
                                    : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // TAB 0: Corporate Zonal View
                if (_selectedTab == 0) ...[
                  // Hub Selector
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setState(() => _selectedHub = 'HITEC_NANAKRAMGUDA'),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: _selectedHub == 'HITEC_NANAKRAMGUDA'
                                ? AppColors.primary.withValues(alpha: 0.15)
                                : Colors.transparent,
                            side: BorderSide(
                              color: _selectedHub == 'HITEC_NANAKRAMGUDA' ? AppColors.primary : Colors.grey.shade400,
                            ),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: Text(
                            'HITEC / Nanakramguda',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _selectedHub == 'HITEC_NANAKRAMGUDA'
                                  ? AppColors.primary
                                  : (isDark ? Colors.white70 : Colors.black87),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setState(() => _selectedHub = 'KOKAPET'),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: _selectedHub == 'KOKAPET'
                                ? AppColors.primary.withValues(alpha: 0.15)
                                : Colors.transparent,
                            side: BorderSide(
                              color: _selectedHub == 'KOKAPET' ? AppColors.primary : Colors.grey.shade400,
                            ),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: Text(
                            'Kokapet Hub',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _selectedHub == 'KOKAPET'
                                  ? AppColors.primary
                                  : (isDark ? Colors.white70 : Colors.black87),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Vehicle Selector Pill
                  Row(
                    children: [
                      ChoiceChip(
                        label: const Text('Sedan (4+1)'),
                        selected: _selectedVehicle == 'SEDAN',
                        onSelected: (val) => setState(() => _selectedVehicle = 'SEDAN'),
                        selectedColor: AppColors.primary.withValues(alpha: 0.2),
                      ),
                      const SizedBox(width: 8),
                      ChoiceChip(
                        label: const Text('SUV (6+1)'),
                        selected: _selectedVehicle == 'SUV',
                        onSelected: (val) => setState(() => _selectedVehicle = 'SUV'),
                        selectedColor: AppColors.primary.withValues(alpha: 0.2),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Zonal Earnings Table
                  _buildZonalTable(context, isDark),
                  const SizedBox(height: 12),

                  // Fixed Payout Guarantee Callout
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.check_circle_outline, color: AppColors.success, size: 18),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Fixed 85% net earnings guaranteed into driver wallet upon trip completion. Zero platform commission deducted.',
                            style: TextStyle(color: AppColors.success, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  // TAB 1: Marketplace Km/Hr
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
                ],
              ],
            ),
    );
  }

  Widget _buildZonalTable(BuildContext context, bool isDark) {
    final hubData = _defaultZonalData[_selectedHub] ?? _defaultZonalData['HITEC_NANAKRAMGUDA']!;
    final rows = <List<String>>[];

    hubData.forEach((zone, values) {
      final earning = values[_selectedVehicle] ?? 500;
      final escort = values['escort'] ?? '';
      rows.add([zone, '₹$earning Net', 'Escort $escort']);
    });

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        children: rows.asMap().entries.map((entry) {
          final i = entry.key;
          final row = entry.value;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          row[0],
                          style: TextStyle(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          row[2],
                          style: TextStyle(
                            color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      row[1],
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
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
