import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../routes/app_routes.dart';
import '../../../services/location_service.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_radius.dart';
import '../../../shared/theme/app_spacing.dart';
import '../../../shared/theme/app_typography.dart';

/// Pickup and drop selection for one cab. Any two places can be chosen; at most one can
/// optionally be labelled "Office" (a display label only: the price comes from the road distance between them).
class SelectRouteSubBottomSheet extends StatefulWidget {
  final String initialPickupAddress;
  final double initialPickupLat;
  final double initialPickupLng;
  final bool initialPickupIsOffice;
  final String initialDropAddress;
  final double initialDropLat;
  final double initialDropLng;
  final bool initialDropIsOffice;
  final String initialPickupInstructions;
  final String initialDropInstructions;

  const SelectRouteSubBottomSheet({
    super.key,
    this.initialPickupAddress = '',
    this.initialPickupLat = 0.0,
    this.initialPickupLng = 0.0,
    this.initialPickupIsOffice = false,
    this.initialDropAddress = '',
    this.initialDropLat = 0.0,
    this.initialDropLng = 0.0,
    this.initialDropIsOffice = false,
    this.initialPickupInstructions = '',
    this.initialDropInstructions = '',
  });

  @override
  State<SelectRouteSubBottomSheet> createState() => _SelectRouteSubBottomSheetState();
}

class _SelectRouteSubBottomSheetState extends State<SelectRouteSubBottomSheet> {
  late String _pickupAddress;
  late double _pickupLat;
  late double _pickupLng;
  late bool _pickupIsOffice;
  late String _dropAddress;
  late double _dropLat;
  late double _dropLng;
  late bool _dropIsOffice;

  bool _isCalculatingRoute = false;
  String? _routeError;
  double _distanceKm = 0.0;
  int _durationMinutes = 0;
  String _formattedDistance = '';
  String _formattedEta = '';

  bool get _hasPickup => _pickupAddress.isNotEmpty && _pickupLat != 0.0 && _pickupLng != 0.0;
  bool get _hasDrop => _dropAddress.isNotEmpty && _dropLat != 0.0 && _dropLng != 0.0;

  @override
  void initState() {
    super.initState();
    _pickupAddress = widget.initialPickupAddress;
    _pickupLat = widget.initialPickupLat;
    _pickupLng = widget.initialPickupLng;
    _pickupIsOffice = widget.initialPickupIsOffice;
    _dropAddress = widget.initialDropAddress;
    _dropLat = widget.initialDropLat;
    _dropLng = widget.initialDropLng;
    _dropIsOffice = widget.initialDropIsOffice && !_pickupIsOffice;
    if (_hasPickup && _hasDrop) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _calculateRoute());
    }
  }

  Future<void> _calculateRoute() async {
    if (!_hasPickup || !_hasDrop) return;
    setState(() {
      _isCalculatingRoute = true;
      _routeError = null;
    });
    try {
      final res = await LocationService.instance.calculateRoadRoute(
        startLat: _pickupLat,
        startLng: _pickupLng,
        endLat: _dropLat,
        endLng: _dropLng,
      );
      final distance = res.distanceKm;
      final minutes = distance > 0 ? ((distance / 40.0) * 60.0).round().clamp(1, 1440) : 0;
      if (!mounted) return;
      setState(() {
        _distanceKm = distance;
        _durationMinutes = minutes;
        _formattedDistance = distance < 1 ? '${(distance * 1000).round()} m' : '${distance.toStringAsFixed(1)} km';
        _formattedEta = minutes < 60 ? '$minutes mins' : '${minutes ~/ 60}h ${minutes % 60}m';
        _isCalculatingRoute = false;
      });
    } catch (_) {
      // Distance shown here is informational; the price is computed on the server.
      if (!mounted) return;
      setState(() {
        _distanceKm = 0.0;
        _durationMinutes = 0;
        _formattedDistance = '';
        _formattedEta = '';
        _isCalculatingRoute = false;
        _routeError = 'Could not get the road route. The price will be checked when you add the cab.';
      });
    }
  }

  Future<void> _pick({required bool isPickup}) async {
    final result = await context.push<Map<String, dynamic>>(
      AppRoutes.universalLocationSearchScreen,
      extra: {
        'title': isPickup ? 'Pickup location' : 'Drop location',
        'initialAddress': isPickup ? _pickupAddress : _dropAddress,
        'initialLat': isPickup ? _pickupLat : _dropLat,
        'initialLng': isPickup ? _pickupLng : _dropLng,
      },
    );
    if (result == null || !mounted) return;
    final addr = (result['fullAddress'] as String?) ?? (result['address'] as String?) ?? (result['title'] as String?) ?? '';
    final lat = (result['latitude'] as num?)?.toDouble() ?? 0.0;
    final lng = (result['longitude'] as num?)?.toDouble() ?? 0.0;
    setState(() {
      if (isPickup) {
        _pickupAddress = addr;
        _pickupLat = lat;
        _pickupLng = lng;
      } else {
        _dropAddress = addr;
        _dropLat = lat;
        _dropLng = lng;
      }
    });
    _calculateRoute();
  }

  void _setOffice({required bool isPickup, required bool isOffice}) {
    setState(() {
      if (isPickup) {
        _pickupIsOffice = isOffice;
        if (isOffice) _dropIsOffice = false;
      } else {
        _dropIsOffice = isOffice;
        if (isOffice) _pickupIsOffice = false;
      }
    });
  }

  void _swap() {
    setState(() {
      final a = _pickupAddress, la = _pickupLat, lo = _pickupLng, o = _pickupIsOffice;
      _pickupAddress = _dropAddress;
      _pickupLat = _dropLat;
      _pickupLng = _dropLng;
      _pickupIsOffice = _dropIsOffice;
      _dropAddress = a;
      _dropLat = la;
      _dropLng = lo;
      _dropIsOffice = o;
    });
    _calculateRoute();
  }

  void _confirm() {
    if (!_hasPickup || !_hasDrop) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please choose both the pickup and the drop location.')),
      );
      return;
    }
    Navigator.pop(context, {
      'pickupAddress': _pickupAddress,
      'pickupLat': _pickupLat,
      'pickupLng': _pickupLng,
      'pickupIsOffice': _pickupIsOffice,
      'dropAddress': _dropAddress,
      'dropLat': _dropLat,
      'dropLng': _dropLng,
      'dropIsOffice': _dropIsOffice,
      'distanceKm': _distanceKm,
      'durationMinutes': _durationMinutes,
      'formattedDistance': _formattedDistance,
      'formattedEta': _formattedEta,
      'pickupInstructions': widget.initialPickupInstructions,
      'dropInstructions': widget.initialDropInstructions,
    });
  }

  Widget _locationTile({
    required bool isDark,
    required bool isPickup,
    required String address,
    required bool isOffice,
    required ValueChanged<bool> onOfficeChanged,
  }) {
    final primaryText = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final muted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    final color = isPickup ? AppColors.success : AppColors.error;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceElevatedDark : Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => _pick(isPickup: isPickup),
            child: Row(
              children: [
                Icon(isPickup ? Icons.trip_origin_rounded : Icons.location_on_rounded, color: color, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(isPickup ? 'PICKUP' : 'DROP',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
                      const SizedBox(height: 2),
                      Text(
                        address.isNotEmpty ? address : (isPickup ? 'Choose pickup location' : 'Choose drop location'),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: address.isNotEmpty ? FontWeight.w600 : FontWeight.normal,
                          color: address.isNotEmpty ? primaryText : muted,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.edit_location_alt_outlined, color: muted, size: 18),
              ],
            ),
          ),
          const SizedBox(height: 8),
          FilterChip(
            label: Text(isOffice ? 'Office' : 'Mark as office', style: const TextStyle(fontSize: 11)),
            avatar: Icon(Icons.business_rounded, size: 14, color: isOffice ? AppColors.primary : muted),
            selected: isOffice,
            onSelected: onOfficeChanged,
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final muted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

    return Material(
      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
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
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
              child: Row(
                children: [
                  Icon(Icons.alt_route_rounded, color: AppColors.primary, size: 22),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Pickup & Drop',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded), tooltip: 'Close'),
                ],
              ),
            ),
            const Divider(height: 1),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _locationTile(
                      isDark: isDark,
                      isPickup: true,
                      address: _pickupAddress,
                      isOffice: _pickupIsOffice,
                      onOfficeChanged: (v) => _setOffice(isPickup: true, isOffice: v),
                    ),
                    Center(
                      child: IconButton(
                        onPressed: (_hasPickup || _hasDrop) ? _swap : null,
                        icon: const Icon(Icons.swap_vert_rounded),
                        tooltip: 'Swap pickup and drop',
                      ),
                    ),
                    _locationTile(
                      isDark: isDark,
                      isPickup: false,
                      address: _dropAddress,
                      isOffice: _dropIsOffice,
                      onOfficeChanged: (v) => _setOffice(isPickup: false, isOffice: v),
                    ),
                    const SizedBox(height: 12),
                    if (_isCalculatingRoute)
                      const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator(strokeWidth: 2)))
                    else if (_formattedDistance.isNotEmpty)
                      Text('Road distance: $_formattedDistance • about $_formattedEta',
                          style: TextStyle(fontSize: 12, color: muted, fontWeight: FontWeight.w600))
                    else if (_routeError != null)
                      Text(_routeError!, style: const TextStyle(fontSize: 12, color: AppColors.warning)),
                  ],
                ),
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.md, 8, AppSpacing.md, AppSpacing.md),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: (_hasPickup && _hasDrop) ? _confirm : null,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                    ),
                    child: const Text('Use this route', style: TextStyle(fontWeight: FontWeight.bold)),
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
