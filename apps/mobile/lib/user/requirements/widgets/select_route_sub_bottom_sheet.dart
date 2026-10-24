import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../routes/app_routes.dart';
import '../../../services/location_service.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_radius.dart';
import '../../../shared/theme/app_spacing.dart';
import '../../../shared/theme/app_typography.dart';
import '../utils/office_hub_detector.dart';
import 'zonal_quote_panel.dart';

class SelectRouteSubBottomSheet extends StatefulWidget {
  final String initialDirection;
  final String initialOfficeHubId;
  final String initialOfficeAddress;
  final double initialOfficeLat;
  final double initialOfficeLng;
  final Map<String, dynamic>? initialLocality;
  final String initialPickupInstructions;
  final String initialDropInstructions;

  const SelectRouteSubBottomSheet({
    super.key,
    this.initialDirection = 'OUTBOUND_FROM_OFFICE',
    this.initialOfficeHubId = 'HITEC_NANAKRAMGUDA',
    this.initialOfficeAddress = '',
    this.initialOfficeLat = 0.0,
    this.initialOfficeLng = 0.0,
    this.initialLocality,
    this.initialPickupInstructions = '',
    this.initialDropInstructions = '',
  });

  @override
  State<SelectRouteSubBottomSheet> createState() => _SelectRouteSubBottomSheetState();
}

class _SelectRouteSubBottomSheetState extends State<SelectRouteSubBottomSheet> {
  late String _direction;
  late String _officeHubId;
  late String _officeAddress;
  late double _officeLat;
  late double _officeLng;
  Map<String, dynamic>? _locality;

  bool _isCalculatingRoute = false;
  double _distanceKm = 0.0;
  int _durationMinutes = 0;
  String _formattedDistance = '';
  String _formattedEta = '';

  bool get _isOfficePickup => _direction == 'OUTBOUND_FROM_OFFICE';

  String get _localityAddress =>
      _locality != null ? '${_locality!['name']}, Hyderabad, Telangana' : '';
  double get _localityLat =>
      ((_locality?['lat'] ?? _locality?['centerLat'] ?? _locality?['latitude']) as num?)?.toDouble() ?? 0.0;
  double get _localityLng =>
      ((_locality?['lng'] ?? _locality?['centerLng'] ?? _locality?['longitude']) as num?)?.toDouble() ?? 0.0;

  String get _pickupAddress => _isOfficePickup ? _officeAddress : _localityAddress;
  double get _pickupLat => _isOfficePickup ? _officeLat : _localityLat;
  double get _pickupLng => _isOfficePickup ? _officeLng : _localityLng;

  String get _dropAddress => !_isOfficePickup ? _officeAddress : _localityAddress;
  double get _dropLat => !_isOfficePickup ? _officeLat : _localityLat;
  double get _dropLng => !_isOfficePickup ? _officeLng : _localityLng;

  @override
  void initState() {
    super.initState();
    _direction = widget.initialDirection;
    _officeHubId = widget.initialOfficeHubId;

    if (widget.initialOfficeAddress.isNotEmpty) {
      _officeAddress = widget.initialOfficeAddress;
      _officeLat = widget.initialOfficeLat;
      _officeLng = widget.initialOfficeLng;
    } else {
      final def = OfficeHubDetector.defaultLocationForHub(_officeHubId);
      _officeAddress = def['address'] as String;
      _officeLat = (def['lat'] as num).toDouble();
      _officeLng = (def['lng'] as num).toDouble();
    }

    _locality = widget.initialLocality;



    if (_locality != null) {
      final locLat = _localityLat;
      final locLng = _localityLng;
      if (locLat == 0.0 || locLng == 0.0) {
        _locality = Map<String, dynamic>.from(_locality!)
          ..['lat'] = 17.3850
          ..['lng'] = 78.4867;
      }
      WidgetsBinding.instance.addPostFrameCallback((_) => _calculateRoute());
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  void _swapDirection() {
    setState(() {
      _direction = _direction == 'OUTBOUND_FROM_OFFICE'
          ? 'INBOUND_TO_OFFICE'
          : 'OUTBOUND_FROM_OFFICE';
    });
    _calculateRoute();
  }

  Future<void> _calculateRoute() async {
    if (_locality == null || _officeLat == 0.0 || _localityLat == 0.0) {
      setState(() {
        _distanceKm = 0.0;
        _durationMinutes = 0;
        _formattedDistance = '';
        _formattedEta = '';
      });
      return;
    }

    setState(() => _isCalculatingRoute = true);
    try {
      final res = await LocationService.instance.calculateRoadRoute(
        startLat: _pickupLat,
        startLng: _pickupLng,
        endLat: _dropLat,
        endLng: _dropLng,
      );

      final distance = res.distanceKm;
      final minutesAt40Kmh =
          distance > 0 ? ((distance / 40.0) * 60.0).round().clamp(1, 1440) : 0;
      final formattedEta = minutesAt40Kmh < 60
          ? '$minutesAt40Kmh mins'
          : '${minutesAt40Kmh ~/ 60}h ${minutesAt40Kmh % 60}m';
      final formattedDistance = distance < 1
          ? '${(distance * 1000).round()} m'
          : '${distance.toStringAsFixed(1)} km';

      if (mounted) {
        setState(() {
          _distanceKm = distance;
          _durationMinutes = minutesAt40Kmh;
          _formattedDistance = formattedDistance;
          _formattedEta = formattedEta;
          _isCalculatingRoute = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isCalculatingRoute = false);
    }
  }

  Future<void> _pickOfficeHub() async {
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return Material(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
          clipBehavior: Clip.antiAlias,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.slate700 : AppColors.slate300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Text(
                  'Select Approved Office Hub',
                  style: AppTypography.h4(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Choose one of the 2 official Hyderabad hubs or search your corporate building:',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
                const SizedBox(height: 14),

                // Hub 1: HITEC / Nanakramguda
                Material(
                  color: Colors.transparent,
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      side: BorderSide(color: AppColors.primary.withValues(alpha: 0.3)),
                    ),
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: const Icon(Icons.business_rounded, color: AppColors.primary, size: 22),
                    ),
                    title: const Text('HITEC / Nanakramguda Hub',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: const Text(
                        'Cyber Towers, Madhapur, Raidurg, Financial District, Waverock',
                        style: TextStyle(fontSize: 11)),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                    onTap: () {
                      final data = OfficeHubDetector.defaultLocationForHub(OfficeHubDetector.hitecId);
                      Navigator.pop(ctx, {...data, 'hubId': OfficeHubDetector.hitecId});
                    },
                  ),
                ),
                const SizedBox(height: 10),

                // Hub 2: Kokapet
                Material(
                  color: Colors.transparent,
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      side: BorderSide(color: AppColors.accentPurple.withValues(alpha: 0.3)),
                    ),
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.accentPurple.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: const Icon(Icons.corporate_fare_rounded,
                          color: AppColors.accentPurple, size: 22),
                    ),
                    title: const Text('Kokapet Hub',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: const Text('Kokapet SEZ, GAR Infobahn, Neopolis, Golden Mile',
                        style: TextStyle(fontSize: 11)),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                    onTap: () {
                      final data =
                          OfficeHubDetector.defaultLocationForHub(OfficeHubDetector.kokapetId);
                      Navigator.pop(ctx, {...data, 'hubId': OfficeHubDetector.kokapetId});
                    },
                  ),
                ),
                const SizedBox(height: 12),

              // Search Custom Building
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    final result = await context.push<Map<String, dynamic>>(
                      AppRoutes.universalLocationSearchScreen,
                      extra: {
                        'title': 'Search Corporate Office Building',
                        'initialAddress': _officeAddress,
                        'initialLat': _officeLat,
                        'initialLng': _officeLng,
                        'officeHubOnly': true,
                      },
                    );
                    if (result != null && mounted) {
                      final addr = (result['fullAddress'] as String?) ??
                          (result['address'] as String?) ??
                          (result['title'] as String?) ??
                          '';
                      final lat = (result['latitude'] as num?)?.toDouble() ?? 17.4435;
                      final lng = (result['longitude'] as num?)?.toDouble() ?? 78.3772;
                      final detected = OfficeHubDetector.detectHub(
                          lat: lat, lng: lng, addressText: addr);
                      if (detected == null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            backgroundColor: AppColors.error,
                            content: Text(
                              '"$addr" is outside approved office hubs (HITEC / Kokapet). Please choose a building inside the hub.',
                            ),
                          ),
                        );
                        return;
                      }
                      setState(() {
                        _officeAddress = addr;
                        _officeLat = lat;
                        _officeLng = lng;
                        _officeHubId = detected;
                      });
                      _calculateRoute();
                    }
                  },
                  icon: const Icon(Icons.search_rounded, size: 18),
                  label: const Text('Search Custom Building in Hub',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape:
                        RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  ),
                ),
              ),
            ],
          ),
          ),
        );
      },
    );

    if (picked != null && mounted) {
      setState(() {
        _officeAddress = picked['address'] as String;
        _officeLat = (picked['lat'] as num).toDouble();
        _officeLng = (picked['lng'] as num).toDouble();
        _officeHubId = (picked['hubId'] as String?) ?? OfficeHubDetector.hitecId;
      });
      _calculateRoute();
    }
  }

  Future<void> _pickEmployeeLocality() async {
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const ZonalLocalityPickerSheet(),
    );

    if (picked != null && mounted) {
      final localityName = picked['name']?.toString() ?? '';
      double lat = ((picked['lat'] ?? picked['centerLat'] ?? picked['latitude']) as num?)?.toDouble() ?? 0.0;
      double lng = ((picked['lng'] ?? picked['centerLng'] ?? picked['longitude']) as num?)?.toDouble() ?? 0.0;

      // Default Hyderabad city coordinates if unpinned so coordinates are never 0.0
      if (lat == 0.0 || lng == 0.0) {
        lat = 17.3850;
        lng = 78.4867;
      }

      final updatedLocality = Map<String, dynamic>.from(picked)
        ..['lat'] = lat
        ..['lng'] = lng;

      setState(() {
        _locality = updatedLocality;
      });
      _calculateRoute();

      // Geocode in background to obtain exact road coordinates for this locality
      if (localityName.isNotEmpty) {
        LocationService.instance
            .searchLocations('$localityName, Hyderabad', lat: 17.3850, lon: 78.4867)
            .then((places) {
          if (places.isNotEmpty && mounted) {
            final best = places.first;
            setState(() {
              _locality = Map<String, dynamic>.from(_locality!)
                ..['lat'] = best.latitude
                ..['lng'] = best.longitude;
            });
            _calculateRoute();
          }
        }).catchError((_) {});
      }
    }
  }

  void _confirmAndApply() {
    if (_officeAddress.isEmpty || _locality == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select both Office Hub and Locality.')),
      );
      return;
    }

    double finalDistance = _distanceKm;
    int finalDuration = _durationMinutes;
    String finalFormattedDist = _formattedDistance;
    String finalFormattedEta = _formattedEta;

    if (finalDistance <= 0.0 && _pickupLat != 0.0 && _dropLat != 0.0) {
      const double p = 0.017453292519943295; // pi / 180
      final dLat = (_dropLat - _pickupLat) * p;
      final dLon = (_dropLng - _pickupLng) * p;
      final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
          math.cos(_pickupLat * p) *
              math.cos(_dropLat * p) *
              math.sin(dLon / 2) *
              math.sin(dLon / 2);
      final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
      final double calculatedKm = (6371.0 * c * 1.28).clamp(1.0, 500.0);
      finalDistance = double.parse(calculatedKm.toStringAsFixed(1));
      finalDuration = ((finalDistance / 40.0) * 60.0).round().clamp(5, 720);
      finalFormattedDist = '${finalDistance.toStringAsFixed(1)} km';
      finalFormattedEta = finalDuration < 60
          ? '$finalDuration mins'
          : '${finalDuration ~/ 60}h ${finalDuration % 60}m';
    }

    Navigator.pop(context, {
      'direction': _direction,
      'officeHubId': _officeHubId,
      'officeAddress': _officeAddress,
      'officeLat': _officeLat,
      'officeLng': _officeLng,
      'locality': _locality,
      'localityName': _locality!['name']?.toString() ?? '',
      'pickupAddress': _pickupAddress,
      'pickupLat': _pickupLat,
      'pickupLng': _pickupLng,
      'dropAddress': _dropAddress,
      'dropLat': _dropLat,
      'dropLng': _dropLng,
      'distanceKm': finalDistance,
      'durationMinutes': finalDuration,
      'formattedDistance': finalFormattedDist,
      'formattedEta': finalFormattedEta,
      'pickupInstructions': widget.initialPickupInstructions,
      'dropInstructions': widget.initialDropInstructions,
      'officeGuidance': _isOfficePickup ? widget.initialPickupInstructions : widget.initialDropInstructions,
      'homeGuidance': !_isOfficePickup ? widget.initialPickupInstructions : widget.initialDropInstructions,
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Material(
      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.88,
        ),
        child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 44,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              decoration: BoxDecoration(
                color: isDark ? AppColors.slate700 : AppColors.slate300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Icon(Icons.alt_route_rounded, color: AppColors.primary, size: 22),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Select Route & Locations',
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.h4(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                  tooltip: 'Close',
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Direction & Swap Toggle
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'Route & Direction',
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: _swapDirection,
                        icon: const Icon(Icons.swap_vert_rounded, size: 16),
                        label: const Text('Swap Direction',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Segmented Direction Buttons
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            if (_direction != 'OUTBOUND_FROM_OFFICE') {
                              setState(() => _direction = 'OUTBOUND_FROM_OFFICE');
                              _calculateRoute();
                            }
                          },
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
                            decoration: BoxDecoration(
                              color: _direction == 'OUTBOUND_FROM_OFFICE'
                                  ? AppColors.primary
                                  : (isDark ? AppColors.bgDark : AppColors.slate100),
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(
                                color: _direction == 'OUTBOUND_FROM_OFFICE'
                                    ? AppColors.primary
                                    : (isDark ? AppColors.borderDark : AppColors.borderLight),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.business_rounded,
                                    size: 15,
                                    color: _direction == 'OUTBOUND_FROM_OFFICE'
                                        ? Colors.white
                                        : AppColors.slate500),
                                const SizedBox(width: 4),
                                Icon(Icons.arrow_forward_rounded,
                                    size: 12,
                                    color: _direction == 'OUTBOUND_FROM_OFFICE'
                                        ? Colors.white70
                                        : AppColors.slate400),
                                const SizedBox(width: 4),
                                Icon(Icons.home_rounded,
                                    size: 15,
                                    color: _direction == 'OUTBOUND_FROM_OFFICE'
                                        ? Colors.white
                                        : AppColors.slate500),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    'Office → Home',
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: _direction == 'OUTBOUND_FROM_OFFICE'
                                          ? Colors.white
                                          : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            if (_direction != 'INBOUND_TO_OFFICE') {
                              setState(() => _direction = 'INBOUND_TO_OFFICE');
                              _calculateRoute();
                            }
                          },
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
                            decoration: BoxDecoration(
                              color: _direction == 'INBOUND_TO_OFFICE'
                                  ? AppColors.primary
                                  : (isDark ? AppColors.bgDark : AppColors.slate100),
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(
                                color: _direction == 'INBOUND_TO_OFFICE'
                                    ? AppColors.primary
                                    : (isDark ? AppColors.borderDark : AppColors.borderLight),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.home_rounded,
                                    size: 15,
                                    color: _direction == 'INBOUND_TO_OFFICE'
                                        ? Colors.white
                                        : AppColors.slate500),
                                const SizedBox(width: 4),
                                Icon(Icons.arrow_forward_rounded,
                                    size: 12,
                                    color: _direction == 'INBOUND_TO_OFFICE'
                                        ? Colors.white70
                                        : AppColors.slate400),
                                const SizedBox(width: 4),
                                Icon(Icons.business_rounded,
                                    size: 15,
                                    color: _direction == 'INBOUND_TO_OFFICE'
                                        ? Colors.white
                                        : AppColors.slate500),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    'Home → Office',
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: _direction == 'INBOUND_TO_OFFICE'
                                          ? Colors.white
                                          : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.lg),

                  // Stop 1: Pickup Location Card
                  Container(
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.bgDark : AppColors.bgLight,
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                    ),
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                color: AppColors.success,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'PICKUP LOCATION (STOP 1)',
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: (_isOfficePickup ? AppColors.primary : AppColors.accentPurple)
                                    .withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                _isOfficePickup ? 'Office Hub' : 'Employee Home',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: _isOfficePickup ? AppColors.primary : AppColors.accentPurple,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        InkWell(
                          onTap: _isOfficePickup ? _pickOfficeHub : _pickEmployeeLocality,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  _isOfficePickup ? Icons.business_rounded : Icons.home_rounded,
                                  color: AppColors.primary,
                                  size: 20,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _isOfficePickup
                                            ? (_officeHubId.contains('KOKAPET') ? 'Kokapet Hub' : 'HITEC / Nanakramguda')
                                            : (_locality?['name'] ?? 'Tap to select locality'),
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                      Text(
                                        _pickupAddress.isNotEmpty ? _pickupAddress : 'Tap to configure',
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right, size: 20),
                              ],
                            ),
                          ),
                        ),

                      ],
                    ),
                  ),

                  // Route link connector
                  Container(
                    margin: const EdgeInsets.only(left: 20),
                    width: 2,
                    height: 20,
                    color: isDark ? AppColors.slate700 : AppColors.slate300,
                  ),

                  // Stop 2: Destination Location Card
                  Container(
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.bgDark : AppColors.bgLight,
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                    ),
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                color: AppColors.error,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'DESTINATION LOCATION (STOP 2)',
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: (!_isOfficePickup ? AppColors.primary : AppColors.accentPurple)
                                    .withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                !_isOfficePickup ? 'Office Hub' : 'Employee Home',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: !_isOfficePickup ? AppColors.primary : AppColors.accentPurple,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        InkWell(
                          onTap: !_isOfficePickup ? _pickOfficeHub : _pickEmployeeLocality,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  !_isOfficePickup ? Icons.business_rounded : Icons.home_rounded,
                                  color: AppColors.accentPurple,
                                  size: 20,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        !_isOfficePickup
                                            ? (_officeHubId.contains('KOKAPET') ? 'Kokapet Hub' : 'HITEC / Nanakramguda')
                                            : (_locality?['name'] ?? 'Tap to select locality'),
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                      Text(
                                        _dropAddress.isNotEmpty ? _dropAddress : 'Tap to configure',
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right, size: 20),
                              ],
                            ),
                          ),
                        ),

                      ],
                    ),
                  ),

                  const SizedBox(height: AppSpacing.md),

                  // Route telemetry preview badge (Distance & ETA)
                  if (_isCalculatingRoute)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(8.0),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                            SizedBox(width: 8),
                            Text('Calculating live route telemetry...', style: TextStyle(fontSize: 12)),
                          ],
                        ),
                      ),
                    )
                  else if (_formattedDistance.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          Flexible(
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.navigation_outlined, size: 16, color: AppColors.primary),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text('Distance: $_formattedDistance',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.access_time_rounded, size: 16, color: AppColors.primary),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text('ETA: $_formattedEta',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Confirm button
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _confirmAndApply,
                icon: const Icon(Icons.check_circle_outline, size: 18),
                label: const Text('Confirm Route Locations',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
              ),
            ),
          ),
        ],
      ),
      ),
    );
  }
}
