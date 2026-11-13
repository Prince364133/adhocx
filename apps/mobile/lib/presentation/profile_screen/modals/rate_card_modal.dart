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

  /// "08:00–11:00, 17:00–21:00 IST" from the plan's peak windows; null when none are configured.
  static String? peakWindowsLabel(dynamic windows) {
    if (windows is! List || windows.isEmpty) return null;
    final parts = windows.whereType<Map>().map((w) {
      final start = (w['start'] ?? w['startTime'] ?? '').toString();
      final end = (w['end'] ?? w['endTime'] ?? '').toString();
      return start.isNotEmpty && end.isNotEmpty ? '$start–$end' : '';
    }).where((e) => e.isNotEmpty).toList();
    return parts.isEmpty ? null : '${parts.join(', ')} IST';
  }

  @override
  State<RateCardModal> createState() => _RateCardModalState();
}

class _RateCardModalState extends State<RateCardModal> {
  bool _isLoading = true;
  String _selectedVehicle = 'SEDAN';
  List<Map<String, dynamic>> _databaseSlabs = [];
  String? _rateVersion;
  String? _peakWindowsLabel;

  @override
  void initState() {
    super.initState();
    _fetchRateCard();
  }

  Future<void> _fetchRateCard() async {
    setState(() => _isLoading = true);
    try {
      final res = await DriverService.instance.getDriverDistanceRateCard(
        vehicleCategory: _selectedVehicle,
        forceRefresh: true,
      );
      if (res != null && res is Map && res['slabs'] is List) {
        final slabsList = (res['slabs'] as List).whereType<Map>().map((m) {
          final range = m['range']?.toString() ?? '${m['minKm']}–${m['maxKm']} km';
          final payout = (m['driverPayoutRupees'] as num?)?.toInt() ??
              ((m['driverPayoutPaise'] as num?) != null ? ((m['driverPayoutPaise'] as num) / 100).round() : 0);
          final peakPayout = (m['driverPeakPayoutRupees'] as num?)?.toInt() ??
              ((m['driverPeakPayoutPaise'] as num?) != null ? ((m['driverPeakPayoutPaise'] as num) / 100).round() : payout);
          final desc = m['desc']?.toString() ?? 'Distance band';
          return {
            'range': range,
            'payout': payout,
            'peakPayout': peakPayout,
            'desc': desc,
          };
        }).toList();

        if (mounted) {
          setState(() {
            _databaseSlabs = slabsList;
            _rateVersion = res['version']?.toString();
            _peakWindowsLabel = RateCardModal.peakWindowsLabel(res['peakWindows']);
            _isLoading = false;
          });
          return;
        }
      }
    } catch (_) {}

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return _ModalShell(
      title: 'Driver Distance Rate Card',
      icon: Icons.speed_rounded,
      iconColor: AppColors.info,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Subtitle & Version
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Live distance-based fixed driver payouts loaded from central database.',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ),
              if (_rateVersion != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'v$_rateVersion',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),

          // Vehicle Selector Pill
          Row(
            children: [
              ChoiceChip(
                label: const Text('Sedan (4+1)'),
                selected: _selectedVehicle == 'SEDAN',
                onSelected: (val) {
                  setState(() => _selectedVehicle = 'SEDAN');
                  _fetchRateCard();
                },
                selectedColor: AppColors.primary.withValues(alpha: 0.2),
              ),
              const SizedBox(width: 8),
              ChoiceChip(
                label: const Text('SUV (6+1)'),
                selected: _selectedVehicle == 'SUV',
                onSelected: (val) {
                  setState(() => _selectedVehicle = 'SUV');
                  _fetchRateCard();
                },
                selectedColor: AppColors.primary.withValues(alpha: 0.2),
              ),
            ],
          ),
          if (_peakWindowsLabel != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.bolt_rounded, size: 14, color: AppColors.warning),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    'Peak hours: $_peakWindowsLabel',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.warning),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 14),

          // Distance Slabs Table
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 32.0),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_databaseSlabs.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 24.0),
                child: Text(
                  'No distance slabs found for $_selectedVehicle in the database.',
                  style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                ),
              ),
            )
          else
            _buildDistanceTable(context, isDark),
          const SizedBox(height: 14),

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
                    'Guaranteed net payout credited to your wallet on verified OTP completion. Zero platform commission deducted from the listed rate card. Prices are loaded dynamically from database.',
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

  Widget _buildDistanceTable(BuildContext context, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        children: _databaseSlabs.asMap().entries.map((entry) {
          final i = entry.key;
          final slab = entry.value;
          final payout = slab['payout'];
          final peakPayout = slab['peakPayout'];

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
                          slab['range'] as String,
                          style: TextStyle(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          slab['desc'] as String,
                          style: TextStyle(
                            color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '₹$payout Net',
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (peakPayout != null && peakPayout != payout)
                          Text(
                            'Peak ₹$peakPayout',
                            style: const TextStyle(
                              color: AppColors.warning,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              if (i < _databaseSlabs.length - 1)
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
