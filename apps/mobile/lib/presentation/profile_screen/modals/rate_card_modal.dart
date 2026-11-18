import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../services/auth_service.dart';
import '../../../services/driver_service.dart';
import '../../../services/onboarding_provider.dart';
import '../../../shared/theme/app_colors.dart';

class _ModalShell extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final ScrollController scrollController;
  final Widget child;

  const _ModalShell({
    required this.title,
    required this.icon,
    required this.iconColor,
    required this.scrollController,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final mediaQuery = MediaQuery.of(context);
    final availableHeight = mediaQuery.size.height - mediaQuery.viewPadding.top;
    final maxSheetHeight = availableHeight > 0
        ? availableHeight * 0.85
        : mediaQuery.size.height * 0.85;
    final dividerColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: maxSheetHeight),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(
            top: BorderSide(
              color: dividerColor,
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
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Top drag handle
                  Center(
                    child: Container(
                      width: 38,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: dividerColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      Icon(icon, color: iconColor, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).maybePop(),
                        tooltip: 'Close',
                        visualDensity: VisualDensity.compact,
                        icon: Icon(
                          Icons.close_rounded,
                          size: 20,
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: dividerColor),
            Flexible(
              child: Scrollbar(
                controller: scrollController,
                radius: const Radius.circular(4),
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: EdgeInsets.fromLTRB(
                    20,
                    14,
                    20,
                    mediaQuery.viewPadding.bottom + 20,
                  ),
                  child: child,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class RateCardModal extends StatefulWidget {
  final String? vehicleType;
  final Future<dynamic> Function()? loadDriverProfile;
  final Future<List<Map<String, dynamic>>> Function()? loadVehicleCategories;
  final Future<dynamic> Function(String vehicleCategory)? loadRateCard;

  const RateCardModal({
    super.key,
    this.vehicleType,
    this.loadDriverProfile,
    this.loadVehicleCategories,
    this.loadRateCard,
  });

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

  /// Resolves the driver's registered vehicle category code (e.g. 'SEDAN', 'SUV') from
  /// explicit parameter, live driver profile, auth session, or onboarding state.
  static String? resolveDriverVehicleType({
    String? explicitVehicleType,
    dynamic profile,
    Map<String, dynamic>? authDriverProfile,
    String? onboardingVehicleType,
  }) {
    String? clean(dynamic raw) {
      if (raw == null) return null;
      final trimmed = raw.toString().trim();
      if (trimmed.isEmpty || trimmed.toLowerCase() == 'null') return null;
      return trimmed.toUpperCase();
    }

    String? fromMap(dynamic data) {
      if (data is! Map) return null;
      final direct = clean(data['vehicleType'] ?? data['vehicle_type']);
      if (direct != null) return direct;
      final vehicle = data['vehicle'];
      if (vehicle is Map) {
        final nested = clean(vehicle['vehicleType'] ?? vehicle['vehicle_type'] ?? vehicle['type']);
        if (nested != null) return nested;
      }
      final vehicles = data['vehicles'];
      if (vehicles is List && vehicles.isNotEmpty && vehicles.first is Map) {
        final first = vehicles.first as Map;
        final nested = clean(first['vehicleType'] ?? first['vehicle_type'] ?? first['type']);
        if (nested != null) return nested;
      }
      return null;
    }

    return clean(explicitVehicleType) ??
        fromMap(profile) ??
        fromMap(authDriverProfile) ??
        clean(onboardingVehicleType);
  }

  /// Resolves a display label for [vehicleType] from pricing categories with a clean fallback.
  static String resolveVehicleLabel(
    String vehicleType,
    List<Map<String, dynamic>> categories,
  ) {
    final normalized = vehicleType.trim().toUpperCase();
    for (final cat in categories) {
      final catType = (cat['vehicleType'] ?? '').toString().trim().toUpperCase();
      if (catType == normalized) {
        final label = (cat['categoryLabel'] ?? '').toString().trim();
        if (label.isNotEmpty) return label;
      }
    }
    if (normalized.length <= 3) return normalized;
    return normalized
        .split(RegExp(r'[_\s-]+'))
        .where((p) => p.isNotEmpty)
        .map((p) => (p == 'SUV' || p == 'MUV' || p == 'EV' || p == 'AC')
            ? p
            : '${p[0].toUpperCase()}${p.substring(1).toLowerCase()}')
        .join(' ');
  }

  @override
  State<RateCardModal> createState() => _RateCardModalState();
}

class _RateCardModalState extends State<RateCardModal> {
  final ScrollController _scrollController = ScrollController();

  bool _isLoading = true;
  String? _driverVehicleType;
  String? _driverVehicleLabel;
  List<Map<String, dynamic>> _databaseSlabs = [];
  String? _rateVersion;
  String? _peakWindowsLabel;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _loadDriverRateCard();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  String? _readOnboardingVehicleType() {
    try {
      return context.read<OnboardingProvider>().vehicleType;
    } catch (_) {
      return null;
    }
  }

  Future<void> _loadDriverRateCard() async {
    setState(() {
      _isLoading = true;
      _databaseSlabs = [];
      _loadError = null;
    });

    try {
      dynamic profile;
      if (widget.vehicleType == null || widget.vehicleType!.trim().isEmpty) {
        try {
          profile = await (widget.loadDriverProfile?.call() ??
              DriverService.instance.getProfile());
        } catch (_) {
          profile = null;
        }
      }

      if (!mounted) return;

      final vehicleType = RateCardModal.resolveDriverVehicleType(
        explicitVehicleType: widget.vehicleType,
        profile: profile,
        authDriverProfile: AuthService.instance.currentUser?.driverProfile,
        onboardingVehicleType: _readOnboardingVehicleType(),
      );

      if (vehicleType == null) {
        setState(() {
          _driverVehicleType = null;
          _driverVehicleLabel = null;
          _databaseSlabs = [];
          _loadError =
              'No vehicle category is registered on your profile yet. Please complete your vehicle details to view your rate card.';
          _isLoading = false;
        });
        return;
      }

      List<Map<String, dynamic>> categories = const [];
      try {
        categories = await (widget.loadVehicleCategories?.call() ??
            DriverService.instance.getVehicleCategories());
      } catch (_) {
        categories = const [];
      }

      final vehicleLabel = RateCardModal.resolveVehicleLabel(vehicleType, categories);

      if (!mounted) return;
      setState(() {
        _driverVehicleType = vehicleType;
        _driverVehicleLabel = vehicleLabel;
      });

      final res = await (widget.loadRateCard?.call(vehicleType) ??
          DriverService.instance.getDriverDistanceRateCard(
            vehicleCategory: vehicleType,
            forceRefresh: true,
          ));

      if (!mounted) return;

      if (res != null && res is Map && res['slabs'] is List) {
        final slabsList = (res['slabs'] as List).whereType<Map>().map((m) {
          final range = m['range']?.toString() ?? '${m['minKm']}–${m['maxKm']} km';
          final num payout = (m['driverPayoutRupees'] as num?) ??
              ((m['driverPayoutPaise'] as num?) != null
                  ? ((m['driverPayoutPaise'] as num) / 100)
                  : 0);
          final num peakPayout = (m['driverPeakPayoutRupees'] as num?) ??
              ((m['driverPeakPayoutPaise'] as num?) != null
                  ? ((m['driverPeakPayoutPaise'] as num) / 100)
                  : payout);
          final desc = m['desc']?.toString() ??
              ((m['minKm'] == 0 || (m['minDistanceMExclusive'] ?? 0) == 0)
                  ? 'Base guaranteed payout'
                  : 'Step distance band');
          return {
            'range': range,
            'payout': payout,
            'peakPayout': peakPayout,
            'desc': desc,
          };
        }).toList();

        setState(() {
          _databaseSlabs = slabsList;
          _rateVersion = res['version']?.toString();
          _peakWindowsLabel = RateCardModal.peakWindowsLabel(res['peakWindows']);
          _isLoading = false;
        });
        return;
      }

      setState(() => _isLoading = false);
    } catch (error) {
      if (mounted) {
        setState(() {
          _loadError = 'Could not load the rate card: $error';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final vehicleLabel = _driverVehicleLabel ?? _driverVehicleType;

    return _ModalShell(
      title: 'Driver Distance Rate Card',
      icon: Icons.speed_rounded,
      iconColor: AppColors.info,
      scrollController: _scrollController,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
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
              if (_rateVersion != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'v$_rateVersion',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ],
          ),
          if (vehicleLabel != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: isDark ? 0.18 : 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.28),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.directions_car_rounded,
                    size: 16,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'Your Vehicle: $vehicleLabel',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (_loadError != null) ...[
            const SizedBox(height: 12),
            Text(
              _loadError!,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
            ),
          ],
          if (_peakWindowsLabel != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.bolt_rounded, size: 14, color: AppColors.warning),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    'Peak hours: $_peakWindowsLabel',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.warning,
                    ),
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
          else if (_databaseSlabs.isEmpty && _loadError == null)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 24.0),
                child: Text(
                  'No distance slabs found for ${vehicleLabel ?? 'your vehicle'} in the database.',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ),
            )
          else if (_databaseSlabs.isNotEmpty)
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
            child: const Row(
              children: [
                Icon(Icons.check_circle_outline, color: AppColors.success, size: 18),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'The listed rate-card payout is credited to your wallet after verified OTP completion. Prices are loaded dynamically from the database.',
                    style: TextStyle(
                      color: AppColors.success,
                      fontSize: 11,
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

  String _formatCurrency(dynamic value) {
    if (value is! num) return value?.toString() ?? '0';
    if (value % 1 == 0) return value.toInt().toString();
    return value.toStringAsFixed(1);
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
                    Expanded(
                      child: Column(
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
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '₹${_formatCurrency(payout)} Net',
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (peakPayout != null && peakPayout != payout)
                          Text(
                            'Peak ₹${_formatCurrency(peakPayout)}',
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
