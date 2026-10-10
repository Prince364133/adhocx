import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../routes/app_routes.dart';
import '../../../services/driver_service.dart';
import '../../../services/user_service.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_radius.dart';
import '../../../shared/theme/app_spacing.dart';
import '../../../shared/theme/app_typography.dart';
import '../models/cab_cart_item.dart';
import '../utils/office_hub_detector.dart';
import 'select_route_sub_bottom_sheet.dart';
import 'select_date_time_sub_bottom_sheet.dart';

class AddCabModalBottomSheet extends StatefulWidget {
  final CabCartItem? existingItem;
  final int cabNumber;

  const AddCabModalBottomSheet({
    super.key,
    this.existingItem,
    required this.cabNumber,
  });

  @override
  State<AddCabModalBottomSheet> createState() => _AddCabModalBottomSheetState();
}

class _AddCabModalBottomSheetState extends State<AddCabModalBottomSheet> {
  late String _vehicleType;
  late String _vehicleLabel;
  late int _passengers;

  // Locations state
  String _direction = 'OUTBOUND_FROM_OFFICE';
  String _officeHubId = OfficeHubDetector.hitecId;
  String _officeAddress = '';
  double _officeLat = 0.0;
  double _officeLng = 0.0;
  Map<String, dynamic>? _locality;
  String _localityName = '';
  String _pickupAddress = '';
  double _pickupLat = 0.0;
  double _pickupLng = 0.0;
  String _dropAddress = '';
  double _dropLat = 0.0;
  double _dropLng = 0.0;
  double _distanceKm = 0.0;
  int _durationMinutes = 0;
  String _formattedDistance = '';
  String _formattedEta = '';

  // Trip options
  static const String _tripType = 'One Way';
  bool _hasEscort = false;
  Map<String, dynamic>? _zonalQuote;
  double _estimatedFare = 800.0;
  String _pickupInstructions = '';
  String _dropInstructions = '';

  // Date and Time
  String _pickupDate = '';
  String _pickupTime = '';
  late DateTime _reportingDateTime;

  // Stops & notes
  final List<String> _additionalStops = [];
  late TextEditingController _notesController;

  List<Map<String, dynamic>> _vehicleOptions = <Map<String, dynamic>>[
    <String, dynamic>{
      'id': 'SEDAN',
      'label': 'Prime Sedan',
      'subtitle': '4 + 1 Passengers • Ac Commercial',
      'maxSeats': 4,
      'baseRate': 800.0,
      'baseKm': 40.0,
      'perKmRate': 14.5,
      'icon': Icons.directions_car_rounded,
    },
    <String, dynamic>{
      'id': 'SUV',
      'label': 'SUV 7 Seater',
      'subtitle': '6 + 1 Passengers • Extra Luggage',
      'maxSeats': 6,
      'baseRate': 1400.0,
      'baseKm': 40.0,
      'perKmRate': 19.0,
      'icon': Icons.airport_shuttle_rounded,
    },
    <String, dynamic>{
      'id': 'HATCHBACK',
      'label': 'Compact Hatchback',
      'subtitle': '4 + 1 Passengers • City Budget',
      'maxSeats': 4,
      'baseRate': 500.0,
      'baseKm': 20.0,
      'perKmRate': 11.0,
      'icon': Icons.electric_car_rounded,
    },
    <String, dynamic>{
      'id': 'BUS',
      'label': 'Commercial Coach Bus',
      'subtitle': '24 - 40 Passengers • Coach Bus',
      'maxSeats': 24,
      'baseRate': 6500.0,
      'baseKm': 100.0,
      'perKmRate': 45.0,
      'icon': Icons.directions_bus_rounded,
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadLivePricingTiers();
    final item = widget.existingItem;
    if (item != null) {
      _vehicleType = item.vehicleType;
      _vehicleLabel = item.vehicleLabel;
      _passengers = item.passengers;
      _direction = item.direction;
      _officeHubId = item.officeHubId;
      _officeAddress = item.officeAddress;
      _officeLat = item.officeLat;
      _officeLng = item.officeLng;
      _locality = item.locality;
      _localityName = item.localityName;
      _pickupAddress = item.pickupAddress;
      _pickupLat = item.pickupLat;
      _pickupLng = item.pickupLng;
      _dropAddress = item.dropAddress;
      _dropLat = item.dropLat;
      _dropLng = item.dropLng;
      _distanceKm = item.distanceKm;
      _durationMinutes = item.durationMinutes;
      _formattedDistance = item.formattedDistance;
      _formattedEta = item.formattedEta;
      _hasEscort = item.hasEscort;
      _pickupInstructions = item.pickupInstructions;
      _dropInstructions = item.dropInstructions;
      _pickupDate = item.pickupDate;
      _pickupTime = item.pickupTime;
      _reportingDateTime = item.reportingDateTime;
      _additionalStops.addAll(item.additionalStops);
      _notesController = TextEditingController(text: item.additionalInfo);
    } else {
      _vehicleType = 'SEDAN';
      _vehicleLabel = 'Prime Sedan';
      _passengers = 4;
      final def = OfficeHubDetector.defaultLocationForHub(_officeHubId);
      _officeAddress = def['address'] as String;
      _officeLat = (def['lat'] as num).toDouble();
      _officeLng = (def['lng'] as num).toDouble();

      final now = DateTime.now().add(const Duration(hours: 4));
      _reportingDateTime = now;
      _pickupDate =
          '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      final hour = now.hour;
      final minute = now.minute.toString().padLeft(2, '0');
      final period = hour >= 12 ? 'PM' : 'AM';
      final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
      _pickupTime = '${displayHour.toString().padLeft(2, '0')}:$minute $period';
      _notesController = TextEditingController();
    }
    _estimatedFare = widget.existingItem?.estimatedFare ?? 800.0;
    // Preload live rate card from dedicated backend pricing service
    UserService.instance.getVendorZonalRateCard();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refreshLiveFare());
  }

  Future<void> _loadLivePricingTiers() async {
    try {
      final tiers = await DriverService.instance.getVehicleCategories(forceRefresh: true);
      if (tiers.isNotEmpty && mounted) {
        setState(() {
          _vehicleOptions = tiers.map((t) {
            final vType = (t['vehicleType'] as String? ?? 'SEDAN').toUpperCase();
            final label = t['categoryLabel']?.toString() ?? vType;
            final seating = t['seatingCapacity']?.toString() ?? '4 + 1 Passengers';
            int maxSeats = 4;
            if (vType == 'SUV') {
              maxSeats = 6;
            } else if (vType == 'BUS') {
              maxSeats = 24;
            } else if (vType == 'TEMPO_TRAVELLER') {
              maxSeats = 12;
            } else if (seating.contains('6')) {
              maxSeats = 6;
            } else if (seating.contains('12')) {
              maxSeats = 12;
            } else if (seating.contains('24')) {
              maxSeats = 24;
            }

            IconData icon = Icons.directions_car_rounded;
            if (vType == 'SUV') {
              icon = Icons.airport_shuttle_rounded;
            } else if (vType == 'BUS') {
              icon = Icons.directions_bus_rounded;
            } else if (vType == 'TEMPO_TRAVELLER' || vType == 'TATA_ACE' || vType == 'PICKUP_TRUCK') {
              icon = Icons.local_shipping_rounded;
            } else if (vType == 'HATCHBACK') {
              icon = Icons.electric_car_rounded;
            }

            return {
              'id': vType,
              'label': label,
              'subtitle': seating,
              'maxSeats': maxSeats,
              'baseRate': (t['baseFare'] as num?)?.toDouble() ?? 800.0,
              'baseKm': (t['baseKm'] as num?)?.toDouble() ?? 40.0,
              'perKmRate': (t['perKmRate'] as num?)?.toDouble() ?? 14.5,
              'icon': icon,
            };
          }).toList();
        });
        _refreshLiveFare();
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Map<String, dynamic> _getSelectedVehicleOption() {
    for (final v in _vehicleOptions) {
      if (v['id'] == _vehicleType) {
        return v;
      }
    }
    if (_vehicleOptions.isNotEmpty) {
      return _vehicleOptions.first;
    }
    return <String, dynamic>{
      'id': 'SEDAN',
      'label': 'Prime Sedan',
      'maxSeats': 4,
      'baseRate': 800.0,
      'baseKm': 40.0,
      'perKmRate': 14.5,
    };
  }

  int get _currentMaxSeats {
    final opt = _getSelectedVehicleOption();
    return (opt['maxSeats'] as num?)?.toInt() ?? 4;
  }

  /// Recalculates real fare using the dedicated pricing service.
  /// Decides real rates on calculation without any hardcoded values in UI components.
  Future<void> _refreshLiveFare() async {
    // 1. Instant responsive calculation using dedicated service cached rate card & tiers
    final syncFare = UserService.instance.calculateSynchronousFare(
      vehicleType: _vehicleType,
      officeHubId: _officeHubId,
      locality: _locality,
      hasEscort: _hasEscort,
      distanceKm: _distanceKm,
      vehicleTiers: _vehicleOptions,
      existingQuote: _zonalQuote,
    );
    if (mounted) {
      setState(() {
        _estimatedFare = syncFare;
      });
    }

    // 2. Query dedicated backend pricing service for authoritative quotation
    try {
      final localityId = _locality?['id']?.toString();
      if (localityId != null && localityId.isNotEmpty) {
        final quote = await UserService.instance.createZonalQuote(
          officeHubId: _officeHubId,
          direction: _direction,
          localityId: localityId,
          vehicleType: _vehicleType == 'SUV' ? 'SUV' : 'SEDAN',
          hasEscort: _hasEscort,
          pickupLat: _pickupLat,
          pickupLng: _pickupLng,
          dropLat: _dropLat,
          dropLng: _dropLng,
        );
        if (mounted && quote.isNotEmpty && quote['canAutoQuote'] != false) {
          setState(() {
            _zonalQuote = quote;
            final total = (quote['totalAmount'] as num?)?.toDouble();
            if (total != null && total > 0) {
              _estimatedFare = total.roundToDouble();
            }
          });
          return;
        }
      }

      // Authoritative pricing service calculation
      final serverFare = await UserService.instance.calculateEstimatedFare(
        vehicleType: _vehicleType,
        officeHubId: _officeHubId,
        direction: _direction,
        locality: _locality,
        hasEscort: _hasEscort,
        distanceKm: _distanceKm,
        durationMinutes: _durationMinutes,
        pickupLat: _pickupLat,
        pickupLng: _pickupLng,
        dropLat: _dropLat,
        dropLng: _dropLng,
        existingQuote: _zonalQuote,
      );
      if (mounted) {
        setState(() {
          _estimatedFare = serverFare;
        });
      }
    } catch (_) {}
  }

  Future<void> _openSelectRouteSubSheet() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SelectRouteSubBottomSheet(
        initialDirection: _direction,
        initialOfficeHubId: _officeHubId,
        initialOfficeAddress: _officeAddress,
        initialOfficeLat: _officeLat,
        initialOfficeLng: _officeLng,
        initialLocality: _locality,
        initialPickupInstructions: _pickupInstructions,
        initialDropInstructions: _dropInstructions,
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _zonalQuote = null;
        _direction = (result['direction'] as String?) ?? 'OUTBOUND_FROM_OFFICE';
        _officeHubId = (result['officeHubId'] as String?) ?? OfficeHubDetector.hitecId;
        _officeAddress = (result['officeAddress'] as String?) ?? '';
        _officeLat = (result['officeLat'] as num?)?.toDouble() ?? 0.0;
        _officeLng = (result['officeLng'] as num?)?.toDouble() ?? 0.0;
        _locality = result['locality'] as Map<String, dynamic>?;
        _localityName = (result['localityName'] as String?) ?? '';
        _pickupAddress = (result['pickupAddress'] as String?) ?? '';
        _pickupLat = (result['pickupLat'] as num?)?.toDouble() ?? 0.0;
        _pickupLng = (result['pickupLng'] as num?)?.toDouble() ?? 0.0;
        _dropAddress = (result['dropAddress'] as String?) ?? '';
        _dropLat = (result['dropLat'] as num?)?.toDouble() ?? 0.0;
        _dropLng = (result['dropLng'] as num?)?.toDouble() ?? 0.0;
        _distanceKm = (result['distanceKm'] as num?)?.toDouble() ?? 0.0;
        _durationMinutes = (result['durationMinutes'] as num?)?.toInt() ?? 0;
        _formattedDistance = (result['formattedDistance'] as String?) ?? '';
        _formattedEta = (result['formattedEta'] as String?) ?? '';
        _pickupInstructions = (result['pickupInstructions'] as String?) ?? '';
        _dropInstructions = (result['dropInstructions'] as String?) ?? '';
      });
      _refreshLiveFare();
    }
  }

  Future<void> _openSelectDateTimeSubSheet() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SelectDateTimeSubBottomSheet(
        initialDate: _pickupDate,
        initialTime: _pickupTime,
        initialDateTime: _reportingDateTime,
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _pickupDate = (result['pickupDate'] as String?) ?? _pickupDate;
        _pickupTime = (result['pickupTime'] as String?) ?? _pickupTime;
        _reportingDateTime = (result['reportingDateTime'] as DateTime?) ?? _reportingDateTime;
      });
    }
  }

  Future<void> _addStop() async {
    final result = await context.push<Map<String, dynamic>>(
      AppRoutes.universalLocationSearchScreen,
      extra: {
        'title': 'Search Stop ${_additionalStops.length + 1} Address',
      },
    );
    if (result != null && mounted) {
      final addr = (result['fullAddress'] as String?) ??
          (result['address'] as String?) ??
          (result['title'] as String?) ??
          '';
      if (addr.trim().isNotEmpty) {
        setState(() {
          _additionalStops.add(addr.trim());
        });
      }
    }
  }

  Future<void> _pickLocationForStop(int index) async {
    final result = await context.push<Map<String, dynamic>>(
      AppRoutes.universalLocationSearchScreen,
      extra: {
        'title': 'Search Stop ${index + 1} Address',
        'initialAddress': _additionalStops[index],
      },
    );
    if (result != null && mounted) {
      final addr = (result['fullAddress'] as String?) ??
          (result['address'] as String?) ??
          (result['title'] as String?) ??
          '';
      if (addr.trim().isNotEmpty) {
        setState(() {
          _additionalStops[index] = addr.trim();
        });
      }
    }
  }

  void _removeStop(int index) {
    setState(() {
      _additionalStops.removeAt(index);
    });
  }

  void _saveCab() {
    if (_pickupAddress.isEmpty || _dropAddress.isEmpty || _locality == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select both Pickup and Destination locations via "Select Location".'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final String itemId = widget.existingItem?.id ??
        'cab_${DateTime.now().millisecondsSinceEpoch}_${(1000 + (DateTime.now().microsecond % 9000))}';

    final cleanStops = _additionalStops
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    final cab = CabCartItem(
      id: itemId,
      vehicleType: _vehicleType,
      vehicleLabel: _vehicleLabel,
      passengers: _passengers,
      direction: _direction,
      officeHubId: _officeHubId,
      officeAddress: _officeAddress,
      officeLat: _officeLat,
      officeLng: _officeLng,
      locality: _locality,
      localityName: _localityName,
      pickupAddress: _pickupAddress,
      pickupLat: _pickupLat,
      pickupLng: _pickupLng,
      pickupInstructions: _pickupInstructions,
      dropAddress: _dropAddress,
      dropLat: _dropLat,
      dropLng: _dropLng,
      dropInstructions: _dropInstructions,
      tripType: _tripType,
      hasEscort: _hasEscort,
      pickupDate: _pickupDate,
      pickupTime: _pickupTime,
      reportingDateTime: _reportingDateTime,
      additionalStops: cleanStops,
      additionalInfo: _notesController.text.trim(),
      distanceKm: _distanceKm,
      durationMinutes: _durationMinutes,
      formattedDistance: _formattedDistance,
      formattedEta: _formattedEta,
      estimatedFare: _estimatedFare,
      zonalQuoteId: _zonalQuote?['quoteId'] as String?,
    );

    Navigator.pop(context, cab);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isEditing = widget.existingItem != null;

    final hasRouteSelected = _locality != null && _pickupAddress.isNotEmpty;
    final estimatedFare = _estimatedFare;

    return Material(
      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.92,
        ),
        child: Column(
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
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: const Icon(Icons.local_taxi_rounded, color: AppColors.primary, size: 20),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isEditing ? 'Edit Cab #${widget.cabNumber}' : 'Add Cab #${widget.cabNumber}',
                              style: AppTypography.h4(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              'Configure vehicle, route, passengers & schedule',
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
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

          // Scrollable configuration form
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── 1. Vehicle Type (Cab Type) & Passengers ─────────────────
                  Text(
                    'Cab Type *',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Horizontal vehicle selection cards
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _vehicleOptions.map((opt) {
                        final isSelected = opt['id'] == _vehicleType;
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _zonalQuote = null;
                              _vehicleType = opt['id'] as String;
                              _vehicleLabel = opt['label'] as String;
                              if (_passengers > _currentMaxSeats) {
                                _passengers = _currentMaxSeats;
                              }
                            });
                            _refreshLiveFare();
                          },
                          child: Container(
                            width: 140,
                            margin: const EdgeInsets.only(right: 10),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.primary.withValues(alpha: 0.1)
                                  : (isDark ? AppColors.bgDark : AppColors.bgLight),
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.primary
                                    : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                width: isSelected ? 2 : 1,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Icon(
                                      opt['icon'] as IconData,
                                      color: isSelected ? AppColors.primary : AppColors.slate500,
                                      size: 22,
                                    ),
                                    if (isSelected)
                                      const Icon(Icons.check_circle_rounded,
                                          color: AppColors.primary, size: 16),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  opt['label'] as String,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: isSelected ? AppColors.primary : null,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Max ${opt['maxSeats']} seats',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                  const SizedBox(height: AppSpacing.lg),

                  // Passengers Counter
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.bgDark : AppColors.bgLight,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              const Icon(Icons.people_alt_outlined, size: 20, color: AppColors.primary),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Passengers in this Cab',
                                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis),
                                    Text('Max $_currentMaxSeats seats available',
                                        style: TextStyle(
                                            fontSize: 11,
                                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        Row(
                          children: [
                            IconButton(
                              onPressed: _passengers > 1
                                  ? () => setState(() => _passengers--)
                                  : null,
                              icon: const Icon(Icons.remove_circle_outline, size: 22),
                              color: AppColors.primary,
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(AppRadius.sm),
                              ),
                              child: Text(
                                '$_passengers',
                                style: const TextStyle(
                                    fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.primary),
                              ),
                            ),
                            IconButton(
                              onPressed: _passengers < _currentMaxSeats
                                  ? () => setState(() => _passengers++)
                                  : null,
                              icon: const Icon(Icons.add_circle_outline, size: 22),
                              color: AppColors.primary,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: AppSpacing.lg),

                  // ── 2. Route & Locations ("Select Location" Tile/Button) ─────
                  Text(
                    'Route & Locations *',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                  const SizedBox(height: 6),

                  InkWell(
                    onTap: _openSelectRouteSubSheet,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: hasRouteSelected
                            ? (isDark ? AppColors.bgDark : AppColors.bgLight)
                            : AppColors.primary.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(
                          color: hasRouteSelected
                              ? AppColors.primary.withValues(alpha: 0.5)
                              : AppColors.primary,
                          width: hasRouteSelected ? 1 : 1.5,
                        ),
                      ),
                      child: hasRouteSelected
                          ? Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Align(
                                        alignment: Alignment.centerLeft,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary.withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            _direction == 'OUTBOUND_FROM_OFFICE'
                                                ? '🏢 → 🏠 Office → Home'
                                                : '🏠 → 🏢 Home → Office',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.primary,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    TextButton(
                                      onPressed: _openSelectRouteSubSheet,
                                      style: TextButton.styleFrom(
                                        padding: EdgeInsets.zero,
                                        minimumSize: const Size(60, 24),
                                      ),
                                      child: const Text('Change Location',
                                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    const Icon(Icons.circle, size: 10, color: AppColors.success),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'From: ${_pickupAddress.split(',').first.trim()}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    const Icon(Icons.circle, size: 10, color: AppColors.error),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'To: ${_dropAddress.split(',').first.trim()}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                    ),
                                  ],
                                ),
                                if (_formattedDistance.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    '🛣️ $_formattedDistance • ⏱️ $_formattedEta',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                    ),
                                  ),
                                ],
                              ],
                            )
                          : Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.15),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.add_location_alt_rounded,
                                      color: AppColors.primary, size: 22),
                                ),
                                const SizedBox(width: 14),
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Select Location (Pickup & Drop)',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                      SizedBox(height: 2),
                                      Text(
                                        'Choose Office Hub and Employee Locality',
                                        style: TextStyle(fontSize: 11, color: AppColors.slate600),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.arrow_forward_ios_rounded,
                                    size: 16, color: AppColors.primary),
                              ],
                            ),
                    ),
                  ),

                  const SizedBox(height: AppSpacing.lg),

                  // ── 3. Security Escort ──────────────────────────
                  InkWell(
                    onTap: () {
                      setState(() {
                        _zonalQuote = null;
                        _hasEscort = !_hasEscort;
                      });
                      _refreshLiveFare();
                    },
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: _hasEscort
                            ? AppColors.accentPurple.withValues(alpha: 0.08)
                            : (isDark ? AppColors.bgDark : AppColors.bgLight),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(
                          color: _hasEscort
                              ? AppColors.accentPurple.withValues(alpha: 0.45)
                              : (isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.shield_outlined,
                            size: 18,
                            color: _hasEscort
                                ? AppColors.accentPurple
                                : (isDark ? AppColors.slate400 : AppColors.slate500),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Wrap(
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 6,
                              runSpacing: 2,
                              children: [
                                Text(
                                  'Security Escort',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                  decoration: BoxDecoration(
                                    color: AppColors.accentPurple.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'Approved Ceiling',
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.accentPurple,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 4),
                          Transform.scale(
                            scale: 0.8,
                            child: Switch(
                              value: _hasEscort,
                              activeThumbColor: AppColors.accentPurple,
                              onChanged: (val) {
                                setState(() {
                                  _zonalQuote = null;
                                  _hasEscort = val;
                                });
                                _refreshLiveFare();
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: AppSpacing.lg),

                  // ── 4. Schedule (Select Date & Time Tile/Button) ─────────────
                  Text(
                    'Trip Schedule (Date & Time) *',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                  const SizedBox(height: 6),

                  InkWell(
                    onTap: _openSelectDateTimeSubSheet,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.bgDark : AppColors.bgLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_today_rounded, size: 18, color: AppColors.primary),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    '$_pickupDate  •  $_pickupTime',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Row(
                            children: [
                              Text(
                                'Change',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                              const Icon(Icons.chevron_right, size: 18, color: AppColors.primary),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: AppSpacing.lg),

                  // ── 5. Additional Stops (Optional) ──────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'Additional Stops (Optional)',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      TextButton.icon(
                        onPressed: _addStop,
                        icon: const Icon(Icons.add_location_alt_outlined, size: 16),
                        label: const Text('+ Add Stop',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  if (_additionalStops.isEmpty)
                    Text(
                      'No intermediate stops added.',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    )
                  else
                    Column(
                      children: List.generate(_additionalStops.length, (idx) {
                        final stopAddress = _additionalStops[idx];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.bgDark : AppColors.bgLight,
                            borderRadius: BorderRadius.circular(AppRadius.md),
                            border: Border.all(
                              color: isDark ? AppColors.borderDark : AppColors.borderLight,
                            ),
                          ),
                          child: InkWell(
                            onTap: () => _pickLocationForStop(idx),
                            borderRadius: BorderRadius.circular(AppRadius.md),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withValues(alpha: 0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.place_outlined,
                                      size: 16,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Stop ${idx + 1}',
                                          style: const TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          stopAddress.isNotEmpty
                                              ? stopAddress
                                              : 'Tap to search location on map...',
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: stopAddress.isNotEmpty
                                                ? FontWeight.w600
                                                : FontWeight.normal,
                                            color: stopAddress.isNotEmpty
                                                ? (isDark
                                                    ? AppColors.textPrimaryDark
                                                    : AppColors.textPrimaryLight)
                                                : (isDark
                                                    ? AppColors.textMutedDark
                                                    : AppColors.textMutedLight),
                                          ),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.search_rounded,
                                        size: 18, color: AppColors.primary),
                                    tooltip: 'Search location',
                                    onPressed: () => _pickLocationForStop(idx),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close,
                                        size: 18, color: AppColors.error),
                                    tooltip: 'Remove stop',
                                    onPressed: () => _removeStop(idx),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    ),

                  const SizedBox(height: AppSpacing.lg),

                  // ── 6. Additional Information / Special Notes (Optional) ───
                  Text(
                    'Additional Information / Special Notes (Optional)',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _notesController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'Any special requests or notes for drivers/dispatchers...',
                      hintStyle: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),

                  const SizedBox(height: AppSpacing.lg),

                  // ── 7. Fare Summary Preview Card ────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(color: AppColors.success.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              const Icon(Icons.currency_rupee, color: AppColors.success, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Estimated Cab Fare',
                                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis),
                                    Text(
                                      _locality != null
                                          ? 'Fixed Rate (${_locality?['zoneLabel'] ?? 'Corporate Zonal'}) • ${_hasEscort ? 'Escort Included' : 'No Surge'}'
                                          : (_formattedDistance.isNotEmpty
                                              ? '$_formattedDistance • ${_hasEscort ? 'Security Escort' : 'Standard Duty'}'
                                              : (_hasEscort ? 'Security Escort' : 'Standard Cab Duty')),
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '₹${estimatedFare.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Action Button
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _saveCab,
                icon: Icon(isEditing ? Icons.save_outlined : Icons.add_shopping_cart_rounded, size: 18),
                label: Text(
                  isEditing ? 'Save Changes' : 'Add Cab to Booking',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
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
