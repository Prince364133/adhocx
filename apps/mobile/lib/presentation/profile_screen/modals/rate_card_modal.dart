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
  String _selectedHub = 'HITEC_NANAKRAMGUDA';
  String _selectedVehicle = 'SEDAN';

  /// Live active driver card from the server; the bundled driver.pdf values are the offline fallback.
  Map<String, dynamic>? _remoteZonalCard;

  @override
  void initState() {
    super.initState();
    _loadAllRateCards();
  }

  Future<void> _loadAllRateCards() async {
    try {
      final card = await DriverService.instance.getDriverZonalRateCard(forceRefresh: true);
      if (mounted) {
        setState(() {
          _remoteZonalCard = card is Map<String, dynamic> && card['matrix'] is Map ? card : null;
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
      'Extra (E)': {'SEDAN': 425, 'SUV': 595},
      'Zone 6': {'SEDAN': 510, 'SUV': 765},
      'Zone 5': {'SEDAN': 595, 'SUV': 850},
      'Zone 4': {'SEDAN': 680, 'SUV': 935},
      'Zone 3': {'SEDAN': 765, 'SUV': 1020},
      'Zone 2': {'SEDAN': 850, 'SUV': 1105},
      'Zone 1': {'SEDAN': 935, 'SUV': 1190},
    },
    'KOKAPET': {
      'Extra (E)': {'SEDAN': 510, 'SUV': 680},
      'Zone 6': {'SEDAN': 595, 'SUV': 765},
      'Zone 5': {'SEDAN': 680, 'SUV': 935},
      'Zone 4': {'SEDAN': 765, 'SUV': 1020},
      'Zone 3': {'SEDAN': 850, 'SUV': 1105},
      'Zone 2': {'SEDAN': 935, 'SUV': 1190},
      'Zone 1': {'SEDAN': 1020, 'SUV': 1275},
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
                          'Guaranteed net payout credited to your wallet on verified OTP completion. Zero platform deductions from the listed rate card. Escort, toll or other additions are paid only when shown as a line item before you accept.',
                          style: TextStyle(color: AppColors.success, fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildZonalTable(BuildContext context, bool isDark) {
    final rows = <List<String>>[];
    final card = _remoteZonalCard;
    final remoteHub = card != null ? (card['matrix'] as Map)[_selectedHub] : null;
    final zones = (card?['zones'] as List?)?.whereType<Map>().toList() ?? const [];
    final versionNote = card != null ? 'Rate version ${card['version']}' : 'Standard one-way trip';

    if (remoteHub is Map && zones.isNotEmpty) {
      for (final z in zones) {
        final cell = remoteHub[z['id']] as Map? ?? const {};
        final earning = (_selectedVehicle == 'SUV' ? cell['suv'] : cell['sedan']) as num? ?? 0;
        rows.add(['${z['label']}', '₹${earning.toStringAsFixed(0)} Net', versionNote]);
      }
    } else {
      final hubData = _defaultZonalData[_selectedHub] ?? _defaultZonalData['HITEC_NANAKRAMGUDA']!;
      hubData.forEach((zone, values) {
        rows.add([zone, '₹${values[_selectedVehicle] ?? 0} Net', versionNote]);
      });
    }

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
}
