import 'package:flutter/material.dart';
import '../../../core/networking/api_client.dart' show ApiException;
import '../../../services/driver_service.dart';
import '../../../services/user_service.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_radius.dart';
import '../../../shared/theme/app_spacing.dart';
import '../../../shared/theme/app_typography.dart';
import '../models/cab_cart_item.dart';
import 'security_escort_toggle_card.dart';
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

  // Locations state (any two places; either may be labelled "office")
  String _pickupAddress = '';
  double _pickupLat = 0.0;
  double _pickupLng = 0.0;
  bool _pickupIsOffice = false;
  String _dropAddress = '';
  double _dropLat = 0.0;
  double _dropLng = 0.0;
  bool _dropIsOffice = false;
  double _distanceKm = 0.0;
  int _durationMinutes = 0;
  String _formattedDistance = '';
  String _formattedEta = '';

  // Trip options
  static const String _tripType = 'One Way';
  bool _hasEscort = false;
  double? _policyEscortFee;
  String _pickupInstructions = '';
  String _dropInstructions = '';

  // Server quote for this route and vehicle type (the booked price)
  Map<String, dynamic>? _quote;
  bool _quoting = false;
  String? _quoteError;
  int _quoteRequestSeq = 0;
  double get _estimatedFare => (_quote?['totalAmount'] as num?)?.toDouble() ?? 0.0;

  // Date and Time
  bool _isScheduled = false;
  String _pickupDate = '';
  String _pickupTime = '';
  late DateTime _reportingDateTime;

  // Notes
  late TextEditingController _notesController;

  List<Map<String, dynamic>> _vehicleOptions = <Map<String, dynamic>>[];
  bool _isLoadingCabs = true;

  @override
  void initState() {
    super.initState();
    _loadLivePricingTiers();
    _loadEscortFeePolicy();
    final item = widget.existingItem;
    if (item != null) {
      _vehicleType = item.vehicleType;
      _vehicleLabel = item.vehicleLabel;
      _passengers = item.passengers;
      _pickupAddress = item.pickupAddress;
      _pickupLat = item.pickupLat;
      _pickupLng = item.pickupLng;
      _pickupIsOffice = item.pickupIsOffice;
      _dropAddress = item.dropAddress;
      _dropLat = item.dropLat;
      _dropLng = item.dropLng;
      _dropIsOffice = item.dropIsOffice && !_pickupIsOffice;
      _hasEscort = item.hasEscort;
      if (item.hasValidQuote) {
        _quote = {
          'quoteId': item.quoteId,
          'expiresAt': item.quoteExpiresAt?.toIso8601String(),
          'totalAmount': item.estimatedFare,
          if (item.hasEscort && item.escortFee > 0) 'escortFareRupees': item.escortFee,
          if (item.hasEscort && item.escortFee > 0)
            'baseVendorPriceRupees': (item.estimatedFare - item.escortFee).clamp(0.0, double.infinity),
        };
      }
      _distanceKm = item.distanceKm;
      _durationMinutes = item.durationMinutes;
      _formattedDistance = item.formattedDistance;
      _formattedEta = item.formattedEta;
      _pickupInstructions = item.pickupInstructions;
      _dropInstructions = item.dropInstructions;
      _pickupDate = item.pickupDate;
      _pickupTime = item.pickupTime;
      _reportingDateTime = item.reportingDateTime;
      _isScheduled = item.isScheduled;
      _notesController = TextEditingController(text: item.additionalInfo);
    } else {
      _vehicleType = '';
      _vehicleLabel = '';
      _passengers = 4;

      final now = DateTime.now();
      _isScheduled = false;
      _reportingDateTime = now;
      _pickupDate =
          '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      _pickupTime = 'Now (ASAP)';
      _notesController = TextEditingController();
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_hasRoute && _quote == null) _refreshLiveFare();
    });
  }

  Future<void> _loadEscortFeePolicy() async {
    final fee = await UserService.instance.getEscortFee();
    if (fee != null && mounted) {
      setState(() => _policyEscortFee = fee);
    }
  }

  Future<void> _loadLivePricingTiers() async {
    if (mounted) setState(() => _isLoadingCabs = true);
    try {
      var tiers = await DriverService.instance.getVehicleCategories(forceRefresh: true);
      if (tiers.isEmpty) {
        tiers = await UserService.instance.getPricingTiers(forceRefresh: true);
      }
      final activeTiers = tiers.where((t) {
        return t['isActive'] != false &&
            (t['vehicleType'] as String?)?.trim().isNotEmpty == true;
      }).toList();
      if (activeTiers.isNotEmpty && mounted) {
        setState(() {
          _vehicleOptions = activeTiers.map((t) {
            final vType = (t['vehicleType'] as String).toUpperCase();
            final label = t['categoryLabel']?.toString() ?? vType;
            final seating = t['seatingCapacity']?.toString() ?? '';
            final maxSeats = _categoryCapacity(t);

            IconData icon = Icons.directions_car_rounded;
            final iconKey = t['iconKey'] as String? ?? '';
            if (iconKey == 'bus') {
              icon = Icons.directions_bus_rounded;
            } else if (iconKey == 'truck') {
              icon = Icons.local_shipping_rounded;
            }

            return {
              'id': vType,
              'label': label,
              'subtitle': seating,
              'maxSeats': maxSeats,
              'icon': icon,
            };
          }).where((option) => (option['maxSeats'] as int) > 0).toList();

          // Auto-select first available live category if none set
          if ((_vehicleType.isEmpty || !_vehicleOptions.any((v) => v['id'] == _vehicleType)) &&
              _vehicleOptions.isNotEmpty) {
            _vehicleType = _vehicleOptions.first['id'] as String;
            _vehicleLabel = _vehicleOptions.first['label'] as String;
            if (_passengers > _currentMaxSeats) {
              _passengers = _currentMaxSeats;
            }
          }
          _isLoadingCabs = false;
        });
        if (_hasRoute && _quote == null) _refreshLiveFare();
        return;
      }
    } catch (e) {
      debugPrint('⚠️ [ADD CAB] Error fetching live vehicle tiers: $e');
    }
    if (mounted) {
      setState(() => _isLoadingCabs = false);
    }
  }

  int _categoryCapacity(Map<String, dynamic> tier) {
    final supplied = (tier['maxSeats'] as num?)?.toInt() ??
        (tier['seats'] as num?)?.toInt();
    if (supplied != null && supplied > 0) return supplied;
    final seating = tier['seatingCapacity']?.toString() ?? '';
    final split = RegExp(r'(\d+)\s*\+\s*(\d+)').firstMatch(seating);
    if (split != null) {
      return int.parse(split.group(1)!) + int.parse(split.group(2)!);
    }
    final numeric = RegExp(r'\d+').firstMatch(seating);
    return numeric == null ? 0 : int.parse(numeric.group(0)!);
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
      'id': _vehicleType.isNotEmpty ? _vehicleType : '',
      'label': _vehicleLabel.isNotEmpty ? _vehicleLabel : '',
      'maxSeats': 0,
      'icon': Icons.directions_car_rounded,
    };
  }

  int get _currentMaxSeats {
    final opt = _getSelectedVehicleOption();
    return (opt['maxSeats'] as num?)?.toInt() ?? 0;
  }

  bool get _hasRoute => _pickupLat != 0.0 && _pickupLng != 0.0 && _dropLat != 0.0 && _dropLng != 0.0;

  /// Gets the server quote for the chosen route and vehicle type. No price is shown or saved
  /// unless the server returns one.
  Future<void> _refreshLiveFare() async {
    if (!_hasRoute || _vehicleType.isEmpty) {
      if (mounted) setState(() => _quote = null);
      return;
    }
    final seq = ++_quoteRequestSeq;
    setState(() {
      _quoting = true;
      _quoteError = null;
      _quote = null;
    });
    try {
      final quote = await UserService.instance.createDistanceTripQuote(
        pickupLat: _pickupLat,
        pickupLng: _pickupLng,
        pickupAddress: _pickupAddress,
        dropLat: _dropLat,
        dropLng: _dropLng,
        dropAddress: _dropAddress,
        vehicleCategory: _vehicleType,
        pickupIsOffice: _pickupIsOffice,
        dropIsOffice: _dropIsOffice,
        hasEscort: _hasEscort,
        pickupTime: _reportingDateTime,
      );
      if (!mounted || seq != _quoteRequestSeq) return;
      setState(() {
        _quoting = false;
        if (quote['quoteId'] != null && quote['totalAmount'] != null) {
          _quote = quote;
        } else {
          _quoteError = (quote['errorMessage'] as String?) ?? 'This route could not be priced.';
        }
      });
    } on ApiException catch (e) {
      if (!mounted || seq != _quoteRequestSeq) return;
      setState(() {
        _quoting = false;
        _quoteError = e.message;
      });
    } catch (_) {
      if (!mounted || seq != _quoteRequestSeq) return;
      setState(() {
        _quoting = false;
        _quoteError = 'Could not get a price. Check your connection and try again.';
      });
    }
  }

  Future<void> _openSelectRouteSubSheet() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SelectRouteSubBottomSheet(
        initialPickupAddress: _pickupAddress,
        initialPickupLat: _pickupLat,
        initialPickupLng: _pickupLng,
        initialPickupIsOffice: _pickupIsOffice,
        initialDropAddress: _dropAddress,
        initialDropLat: _dropLat,
        initialDropLng: _dropLng,
        initialDropIsOffice: _dropIsOffice,
        initialPickupInstructions: _pickupInstructions,
        initialDropInstructions: _dropInstructions,
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _pickupAddress = (result['pickupAddress'] as String?) ?? '';
        _pickupLat = (result['pickupLat'] as num?)?.toDouble() ?? 0.0;
        _pickupLng = (result['pickupLng'] as num?)?.toDouble() ?? 0.0;
        _pickupIsOffice = result['pickupIsOffice'] == true;
        _dropAddress = (result['dropAddress'] as String?) ?? '';
        _dropLat = (result['dropLat'] as num?)?.toDouble() ?? 0.0;
        _dropLng = (result['dropLng'] as num?)?.toDouble() ?? 0.0;
        _dropIsOffice = result['dropIsOffice'] == true && !_pickupIsOffice;
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

  void _selectRideNow() {
    setState(() {
      _isScheduled = false;
      final now = DateTime.now();
      _reportingDateTime = now;
      _pickupDate =
          '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      _pickupTime = 'Now (ASAP)';
    });
  }

  Future<void> _selectScheduleLater() async {
    setState(() => _isScheduled = true);
    await _openSelectDateTimeSubSheet();
  }

  Future<void> _openSelectDateTimeSubSheet() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SelectDateTimeSubBottomSheet(
        initialDate: _pickupDate.contains('ASAP') ? '' : _pickupDate,
        initialTime: _pickupTime.contains('ASAP') ? '' : _pickupTime,
        initialDateTime: _reportingDateTime.isBefore(DateTime.now())
            ? DateTime.now().add(const Duration(hours: 2))
            : _reportingDateTime,
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _isScheduled = true;
        _pickupDate = (result['pickupDate'] as String?) ?? _pickupDate;
        _pickupTime = (result['pickupTime'] as String?) ?? _pickupTime;
        _reportingDateTime = (result['reportingDateTime'] as DateTime?) ?? _reportingDateTime;
      });
    }
  }

  void _saveCab() {
    if (!_hasRoute || _pickupAddress.isEmpty || _dropAddress.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select both Pickup and Destination locations via "Select Location".'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }
    if (_quote == null || _quote!['quoteId'] == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_quoteError ?? 'Wait for the price to load before adding the cab.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final String itemId = widget.existingItem?.id ??
        'cab_${DateTime.now().millisecondsSinceEpoch}_${(1000 + (DateTime.now().microsecond % 9000))}';

    final cab = CabCartItem(
      id: itemId,
      vehicleType: _vehicleType,
      vehicleLabel: _vehicleLabel,
      passengers: _passengers,
      pickupAddress: _pickupAddress,
      pickupLat: _pickupLat,
      pickupLng: _pickupLng,
      pickupIsOffice: _pickupIsOffice,
      pickupInstructions: _pickupInstructions,
      dropAddress: _dropAddress,
      dropLat: _dropLat,
      dropLng: _dropLng,
      dropIsOffice: _dropIsOffice,
      dropInstructions: _dropInstructions,
      tripType: _tripType,
      hasEscort: _hasEscort,
      escortFee: _hasEscort ? ((_quote?['escortFareRupees'] as num?)?.toDouble() ?? _policyEscortFee ?? 0.0) : 0.0,
      isScheduled: _isScheduled,
      pickupDate: _pickupDate,
      pickupTime: _pickupTime,
      reportingDateTime: _reportingDateTime,
      additionalStops: const [],
      additionalInfo: _notesController.text.trim(),
      distanceKm: _distanceKm,
      durationMinutes: _durationMinutes,
      formattedDistance: _formattedDistance,
      formattedEta: _formattedEta,
      estimatedFare: _estimatedFare,
      quoteId: _quote!['quoteId'] as String?,
      quoteExpiresAt: DateTime.tryParse(_quote!['expiresAt']?.toString() ?? ''),
    );

    Navigator.pop(context, cab);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isEditing = widget.existingItem != null;

    final hasRouteSelected = _hasRoute && _pickupAddress.isNotEmpty;
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

                  // Horizontal vehicle selection cards (Direct live DB data)
                  if (_isLoadingCabs && _vehicleOptions.isEmpty)
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: List.generate(
                          3,
                          (index) => Container(
                            width: 140,
                            height: 88,
                            margin: const EdgeInsets.only(right: 10),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(
                                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                              ),
                            ),
                            child: const Center(
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            ),
                          ),
                        ),
                      ),
                    )
                  else if (_vehicleOptions.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(
                          color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline_rounded, size: 20, color: AppColors.warning),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Unable to load available cabs from server.',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: _loadLivePricingTiers,
                            child: const Text('Retry', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    )
                  else
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _vehicleOptions.map((opt) {
                          final isSelected = opt['id'] == _vehicleType;
                          return GestureDetector(
                            onTap: () {
                              setState(() {
                                _vehicleType = opt['id'] as String;
                                _vehicleLabel = opt['label'] as String;
                                final newMax = (opt['maxSeats'] as num?)?.toInt() ?? 4;
                                if (_passengers > newMax) {
                                  _passengers = newMax;
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
                                            _pickupIsOffice
                                                ? 'From office'
                                                : (_dropIsOffice ? 'To office' : 'Point to point'),
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
                                        'Any pickup and drop; mark either as office',
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

                  // ── 3. Security Escort ─────────────────────────────────────
                  SecurityEscortToggleCard(
                    hasEscort: _hasEscort,
                    escortFeeRupees: _hasEscort
                        ? ((_quote?['escortFareRupees'] as num?)?.toDouble() ?? _policyEscortFee)
                        : _policyEscortFee,
                    onChanged: (val) {
                      setState(() {
                        _hasEscort = val;
                        _quote = null;
                      });
                      _refreshLiveFare();
                    },
                  ),

                  const SizedBox(height: AppSpacing.lg),

                  // ── 4. Trip Timing & Scheduling (Option Partition) ──────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'Trip Timing & Schedule *',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                      if (_isScheduled) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(AppRadius.pill),
                          ),
                          child: const Text(
                            'Scheduled for Later',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Option Partition (Ride Now vs Schedule for Later)
                  Row(
                    children: [
                      // Option 1: Ride Now (ASAP)
                      Expanded(
                        child: InkWell(
                          onTap: _selectRideNow,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            decoration: BoxDecoration(
                              color: !_isScheduled
                                  ? AppColors.primary.withValues(alpha: 0.08)
                                  : (isDark ? AppColors.bgDark : AppColors.bgLight),
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(
                                color: !_isScheduled
                                    ? AppColors.primary
                                    : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                width: !_isScheduled ? 1.5 : 1,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(5),
                                      decoration: BoxDecoration(
                                        color: AppColors.warning.withValues(alpha: 0.15),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.bolt_rounded, size: 14, color: AppColors.warning),
                                    ),
                                    if (!_isScheduled)
                                      const Icon(Icons.check_circle_rounded, size: 14, color: AppColors.primary),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Ride Now',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Instant dispatch',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Option 2: Schedule for Later
                      Expanded(
                        child: InkWell(
                          onTap: _selectScheduleLater,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            decoration: BoxDecoration(
                              color: _isScheduled
                                  ? AppColors.primary.withValues(alpha: 0.08)
                                  : (isDark ? AppColors.bgDark : AppColors.bgLight),
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(
                                color: _isScheduled
                                    ? AppColors.primary
                                    : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                width: _isScheduled ? 1.5 : 1,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(5),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withValues(alpha: 0.15),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.schedule_rounded, size: 14, color: AppColors.primary),
                                    ),
                                    if (_isScheduled)
                                      const Icon(Icons.check_circle_rounded, size: 14, color: AppColors.primary),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Schedule for Later',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Pick date & time',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 10),

                  // Display timing detail according to partition selection
                  if (_isScheduled) ...[
                    InkWell(
                      onTap: _openSelectDateTimeSubSheet,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.bgDark : AppColors.bgLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.4)),
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
                            const Row(
                              children: [
                                Text(
                                  'Change',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                  ),
                                ),
                                Icon(Icons.chevron_right, size: 18, color: AppColors.primary),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.notifications_active_outlined, size: 14, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Drivers will be dispatched automatically. We will notify you 30 seconds before dispatch begins.',
                              style: TextStyle(
                                fontSize: 10.5,
                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                height: 1.25,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        border: Border.all(color: AppColors.success.withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.flash_on_rounded, size: 14, color: AppColors.success),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Instant Booking: Drivers will be matched immediately upon review & deploy.',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: AppSpacing.lg),

                  // ── 5. Additional Information / Special Notes (Optional) ───
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
                  if (!hasRouteSelected || _quote == null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
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
                                    color: AppColors.primary,
                                    size: 18,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Estimated Cab Fare',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        !hasRouteSelected
                                            ? 'Select pickup & drop location above to view fare'
                                            : (_quoting ? 'Getting the price for this route…' : (_quoteError ?? 'No price yet')),
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
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.bgDark : AppColors.bgLight,
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                            child: Text(
                              '--',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
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
                                        [
                                          if (_quote?['displayedKm'] is num) '${(_quote!['displayedKm'] as num).toStringAsFixed(1)} km',
                                          if (_hasEscort && ((_quote?['escortFareRupees'] as num?)?.toDouble() ?? 0) > 0)
                                            'Base ₹${(((_quote?['baseVendorPriceRupees'] as num?)?.toDouble()) ?? (estimatedFare - (_quote!['escortFareRupees'] as num).toDouble())).toStringAsFixed(0)} + ₹${(_quote!['escortFareRupees'] as num).toStringAsFixed(0)} Escort'
                                          else if (_hasEscort)
                                            'Security Escort',
                                          if (_quote?['planVersion'] != null) 'plan ${_quote!['planVersion']}',
                                          'Fixed distance rate',
                                        ].join(' • '),
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
                onPressed: _quoting ? null : _saveCab,
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
