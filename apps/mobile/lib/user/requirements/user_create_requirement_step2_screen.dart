import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/networking/api_client.dart';
import '../../routes/app_routes.dart';
import '../../services/location_service.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import 'requirement_draft_provider.dart';
import 'utils/office_hub_detector.dart';
import 'widgets/zonal_quote_panel.dart';

class UserCreateRequirementStep2Screen extends StatefulWidget {
  const UserCreateRequirementStep2Screen({super.key});

  @override
  State<UserCreateRequirementStep2Screen> createState() => _UserCreateRequirementStep2ScreenState();
}

class _UserCreateRequirementStep2ScreenState extends State<UserCreateRequirementStep2Screen> {
  late String _tripType;
  late TextEditingController _pickupController;
  late TextEditingController _pickupInstructions;
  late TextEditingController _dropController;
  late TextEditingController _dropInstructions;

  String _officeAddress = '';
  double _officeLat = 0.0;
  double _officeLng = 0.0;

  bool _initialized = false;
  bool _isCalculatingRoute = false;
  RoadRouteResult? _routeResult;

  // Direction: 'OUTBOUND_FROM_OFFICE' (Office -> Home) or 'INBOUND_TO_OFFICE' (Home -> Office)
  String _direction = 'OUTBOUND_FROM_OFFICE';
  Map<String, dynamic>? _locality;
  bool _hasEscort = false;
  bool _loadingQuote = false;
  String? _zonalError;
  Map<String, dynamic>? _zonalQuote;

  bool get _isOfficePickup => _direction == 'OUTBOUND_FROM_OFFICE';

  String get _localityAddress => _locality != null ? '${_locality!['name']}, Hyderabad, Telangana' : '';
  double get _localityLat => (_locality?['lat'] as num?)?.toDouble() ?? 0.0;
  double get _localityLng => (_locality?['lng'] as num?)?.toDouble() ?? 0.0;

  String get _pickupAddress => _isOfficePickup ? _officeAddress : _localityAddress;
  double get _pickupLat => _isOfficePickup ? _officeLat : _localityLat;
  double get _pickupLng => _isOfficePickup ? _officeLng : _localityLng;

  String get _dropAddress => !_isOfficePickup ? _officeAddress : _localityAddress;
  double get _dropLat => !_isOfficePickup ? _officeLat : _localityLat;
  double get _dropLng => !_isOfficePickup ? _officeLng : _localityLng;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final draft = context.read<RequirementDraftProvider>();
      _tripType = draft.tripType;
      _pickupInstructions = TextEditingController(text: draft.pickupInstructions);
      _dropInstructions = TextEditingController(text: draft.dropInstructions);

      _direction = draft.zonalDirection;
      _locality = draft.zonalLocality;
      _hasEscort = draft.zonalHasEscort;
      _zonalQuote = draft.zonalQuote;

      final def = OfficeHubDetector.defaultLocationForHub(
        draft.zonalOfficeHubId.isNotEmpty ? draft.zonalOfficeHubId : OfficeHubDetector.hitecId,
      );
      final defaultOfficeAddr = def['address'] as String;
      final defaultOfficeLat = (def['lat'] as num).toDouble();
      final defaultOfficeLng = (def['lng'] as num).toDouble();

      // Determine office location from draft
      if (draft.pickupLocation.isNotEmpty && !draft.pickupLocation.contains('Gurgaon')) {
        if (_isOfficePickup) {
          _officeAddress = draft.pickupLocation;
          _officeLat = draft.pickupLat != 0.0 ? draft.pickupLat : defaultOfficeLat;
          _officeLng = draft.pickupLng != 0.0 ? draft.pickupLng : defaultOfficeLng;
        } else {
          _officeAddress = draft.dropLocation.isNotEmpty ? draft.dropLocation : defaultOfficeAddr;
          _officeLat = draft.dropLat != 0.0 ? draft.dropLat : defaultOfficeLat;
          _officeLng = draft.dropLng != 0.0 ? draft.dropLng : defaultOfficeLng;
        }
      } else {
        _officeAddress = defaultOfficeAddr;
        _officeLat = defaultOfficeLat;
        _officeLng = defaultOfficeLng;
      }

      _pickupController = TextEditingController(text: _pickupAddress);
      _dropController = TextEditingController(text: _dropAddress);

      _initialized = true;

      WidgetsBinding.instance.addPostFrameCallback((_) {
        _syncToDraft();
        if (_locality != null && _getDetectedHub() != null) {
          _calculateAndSyncRoute();
          _refreshZonalQuote();
        } else {
          setState(() {
            _routeResult = null;
            _zonalQuote = null;
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _pickupController.dispose();
    _pickupInstructions.dispose();
    _dropController.dispose();
    _dropInstructions.dispose();
    super.dispose();
  }

  String? _getDetectedHub() {
    return OfficeHubDetector.detectHub(lat: _officeLat, lng: _officeLng, addressText: _officeAddress);
  }

  bool get _canContinue {
    if (_officeAddress.trim().isEmpty || _locality == null) {
      return false;
    }
    final detected = _getDetectedHub();
    if (detected == null) {
      return false;
    }
    return true;
  }

  Future<void> _calculateAndSyncRoute() async {
    final detected = _getDetectedHub();
    if (_locality == null ||
        detected == null ||
        _pickupLat == 0.0 ||
        _dropLat == 0.0 ||
        (_pickupLat == _dropLat && _pickupLng == _dropLng)) {
      if (mounted) {
        setState(() {
          _routeResult = null;
          _isCalculatingRoute = false;
        });
      }
      context.read<RequirementDraftProvider>().clearRoadRoute();
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

      final distanceKm = res.distanceKm;
      // Real actual estimated driving time calculated with 40 km/h average:
      // Time in minutes = (distanceKm / 40.0) * 60
      final minutesAt40Kmh = distanceKm > 0 ? ((distanceKm / 40.0) * 60.0).round().clamp(1, 1440) : 0;
      final formattedEta = minutesAt40Kmh < 60
          ? '$minutesAt40Kmh mins'
          : '${minutesAt40Kmh ~/ 60}h ${minutesAt40Kmh % 60}m';
      final formattedDistance = distanceKm < 1
          ? '${(distanceKm * 1000).round()} m'
          : '${distanceKm.toStringAsFixed(1)} km';

      final routeResult = RoadRouteResult(
        distanceKm: distanceKm,
        durationMinutes: minutesAt40Kmh,
        formattedDistance: formattedDistance,
        formattedEta: formattedEta,
        isAccurateRoad: res.isAccurateRoad,
      );

      if (mounted) {
        setState(() {
          _routeResult = routeResult;
          _isCalculatingRoute = false;
        });
        context.read<RequirementDraftProvider>().setRoadRoute(
          distanceKm: distanceKm,
          durationMinutes: minutesAt40Kmh,
          formattedDistance: formattedDistance,
          formattedEta: formattedEta,
        );
      }
    } catch (_) {
      if (mounted) setState(() => _isCalculatingRoute = false);
    }
  }

  Future<void> _refreshZonalQuote() async {
    final detected = _getDetectedHub();
    if (_locality == null || detected == null) {
      setState(() {
        _zonalQuote = null;
        _zonalError = null;
      });
      _syncToDraft();
      return;
    }

    setState(() {
      _loadingQuote = true;
      _zonalError = null;
    });

    final draft = context.read<RequirementDraftProvider>();
    final vehicleType = draft.vehicleType.trim().toUpperCase();

    try {
      final res = await UserService.instance.createZonalQuote(
        officeHubId: detected,
        direction: _direction,
        localityId: _locality!['id'] as String,
        vehicleType: vehicleType == 'SUV' ? 'SUV' : 'SEDAN',
        hasEscort: _hasEscort,
        pickupLat: _pickupLat,
        pickupLng: _pickupLng,
        dropLat: _dropLat,
        dropLng: _dropLng,
      );
      if (mounted) {
        setState(() {
          _zonalQuote = res;
          _loadingQuote = false;
        });
        _syncToDraft();
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _zonalQuote = null;
          _loadingQuote = false;
          _zonalError = e.message;
        });
        _syncToDraft();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _zonalQuote = null;
          _loadingQuote = false;
          _zonalError = 'Could not fetch corporate quote. Check your connection.';
        });
        _syncToDraft();
      }
    }
  }

  void _syncToDraft() {
    final detected = _getDetectedHub() ?? OfficeHubDetector.hitecId;
    final draft = context.read<RequirementDraftProvider>();
    draft.setZonalConfig(
      enabled: true,
      officeHubId: detected,
      direction: _direction,
      locality: _locality,
      hasEscort: _hasEscort,
      quote: _zonalQuote,
    );
    draft.updateStep2(
      pickupLocation: _pickupAddress.trim(),
      pickupInstructions: '',
      dropLocation: _dropAddress.trim(),
      dropInstructions: '',
      tripType: _tripType,
      pickupLat: _pickupLat,
      pickupLng: _pickupLng,
      dropLat: _dropLat,
      dropLng: _dropLng,
    );
  }

  void _setDirection(String newDirection) {
    if (_direction == newDirection) return;
    setState(() {
      _direction = newDirection;
      _pickupController.text = _pickupAddress;
      _dropController.text = _dropAddress;
    });
    _syncToDraft();
    _calculateAndSyncRoute();
    _refreshZonalQuote();
  }

  void _swapLocations() {
    _setDirection(_direction == 'OUTBOUND_FROM_OFFICE' ? 'INBOUND_TO_OFFICE' : 'OUTBOUND_FROM_OFFICE');
  }

  Future<void> _openOfficeLocationPicker() async {
    final initialAddress = _officeAddress;
    final initialLat = _officeLat;
    final initialLng = _officeLng;

    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return Container(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
          ),
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
              const SizedBox(height: 4),
              Text(
                'Choose one of the 2 official Hyderabad hubs or search your office building:',
                style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
              ),
              const SizedBox(height: 14),

              // Hub 1: HITEC / Nanakramguda
              ListTile(
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
                title: const Text('HITEC / Nanakramguda Hub', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Cyber Towers, Madhapur, Raidurg, Financial District, Waverock', style: TextStyle(fontSize: 11)),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                onTap: () {
                  Navigator.pop(ctx, OfficeHubDetector.defaultLocationForHub(OfficeHubDetector.hitecId));
                },
              ),
              const SizedBox(height: 10),

              // Hub 2: Kokapet
              ListTile(
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
                  child: const Icon(Icons.corporate_fare_rounded, color: AppColors.accentPurple, size: 22),
                ),
                title: const Text('Kokapet Hub', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Kokapet SEZ, GAR Infobahn, Neopolis, Golden Mile', style: TextStyle(fontSize: 11)),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                onTap: () {
                  Navigator.pop(ctx, OfficeHubDetector.defaultLocationForHub(OfficeHubDetector.kokapetId));
                },
              ),
              const SizedBox(height: 14),

              // Search Specific Building
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    final result = await context.push<Map<String, dynamic>>(
                      AppRoutes.universalLocationSearchScreen,
                      extra: {
                        'title': 'Search Office Address',
                        'initialAddress': initialAddress,
                        'initialLat': initialLat,
                        'initialLng': initialLng,
                      },
                    );
                    if (result != null && mounted) {
                      final addr = (result['fullAddress'] as String?) ?? (result['address'] as String?) ?? (result['title'] as String?) ?? '';
                      final lat = (result['latitude'] as num?)?.toDouble() ?? 17.4435;
                      final lng = (result['longitude'] as num?)?.toDouble() ?? 78.3772;
                      setState(() {
                        _officeAddress = addr;
                        _officeLat = lat;
                        _officeLng = lng;
                        _pickupController.text = _pickupAddress;
                        _dropController.text = _dropAddress;
                      });
                      _syncToDraft();
                      _calculateAndSyncRoute();
                      _refreshZonalQuote();
                    }
                  },
                  icon: const Icon(Icons.search_rounded, size: 18),
                  label: const Text('Search Custom Building / Street in Hub', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );

    if (picked != null && mounted) {
      final addr = picked['address'] as String;
      final lat = (picked['lat'] as num).toDouble();
      final lng = (picked['lng'] as num).toDouble();
      setState(() {
        _officeAddress = addr;
        _officeLat = lat;
        _officeLng = lng;
        _pickupController.text = _pickupAddress;
        _dropController.text = _dropAddress;
      });
      _syncToDraft();
      _calculateAndSyncRoute();
      _refreshZonalQuote();
    }
  }

  Future<void> _openEmployeeLocationPicker() async {
    // Direct user to verified locality picker
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const ZonalLocalityPickerSheet(),
    );

    if (picked != null && mounted) {
      setState(() {
        _locality = picked;
        _pickupController.text = _pickupAddress;
        _dropController.text = _dropAddress;
      });
      _syncToDraft();
      _calculateAndSyncRoute();
      _refreshZonalQuote();
    }
  }

  void _onContinue() {
    if (!_canContinue) return;

    final draft = context.read<RequirementDraftProvider>();
    draft.updateStep2(
      pickupLocation: _pickupAddress.trim(),
      pickupInstructions: '',
      dropLocation: _dropAddress.trim(),
      dropInstructions: '',
      tripType: _tripType,
      pickupLat: _pickupLat,
      pickupLng: _pickupLng,
      dropLat: _dropLat,
      dropLng: _dropLng,
    );

    if (_routeResult != null) {
      draft.setRoadRoute(
        distanceKm: _routeResult!.distanceKm,
        durationMinutes: _routeResult!.durationMinutes,
        formattedDistance: _routeResult!.formattedDistance,
        formattedEta: _routeResult!.formattedEta,
      );
    }

    _syncToDraft();
    context.push(AppRoutes.userCreateRequirementStep3Screen);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryText = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final mutedText = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    final detectedHub = _getDetectedHub();

    final officeAddress = _isOfficePickup ? _pickupController.text.trim() : _dropController.text.trim();
    final isOfficeOutside = officeAddress.isNotEmpty && detectedHub == null;

    final employeeAddress = !_isOfficePickup ? _pickupController.text.trim() : _dropController.text.trim();

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text(
          'Create Requirement',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Stepper Header (1 to 4)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(4, (index) {
                  final stepNum = index + 1;
                  final isActive = stepNum <= 2;
                  return CircleAvatar(
                    radius: 14,
                    backgroundColor: isActive ? AppColors.primary : (isDark ? AppColors.slate800 : AppColors.slate300),
                    child: Text(
                      '$stepNum',
                      style: TextStyle(
                        fontSize: 12,
                        color: isActive ? Colors.white : AppColors.slate600,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  );
                }),
              ),
            ),

            const Divider(),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Section title & Swap button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Route & Direction',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: primaryText),
                        ),
                        TextButton.icon(
                          onPressed: _swapLocations,
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          icon: const Icon(Icons.swap_vert_rounded, size: 16),
                          label: const Text('Swap', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),

                    const SizedBox(height: 6),

                    // 1. DIRECTION SEGMENTED BAR
                    _buildDirectionBar(isDark, primaryText),

                    const SizedBox(height: 12),

                    // 2. UNIFIED CONNECTED ROUTE CARD (Pickup + Drop + Inline Distance & 40km/h ETA)
                    _buildUnifiedRouteCard(
                      isDark: isDark,
                      primaryText: primaryText,
                      mutedText: mutedText,
                      detectedHub: detectedHub,
                      officeAddress: officeAddress,
                      isOfficeOutside: isOfficeOutside,
                      employeeAddress: employeeAddress,
                    ),

                    const SizedBox(height: 12),

                    // 3. COMPACT OPTIONS (Trip Type + Security Escort)
                    _buildOptionsCard(isDark, primaryText, mutedText),

                    // 4. GUARANTEED FARE CARD (only when quote is available & locality is selected)
                    if (_loadingQuote) ...[
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: LinearProgressIndicator(minHeight: 2),
                      ),
                    ] else if (_zonalQuote != null && detectedHub != null && _locality != null) ...[
                      _buildZonalFareCard(isDark, primaryText, mutedText, detectedHub),
                    ] else if (_zonalError != null) ...[
                      Container(
                        margin: const EdgeInsets.only(top: 8),
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 16),
                            const SizedBox(width: 8),
                            Expanded(child: Text(_zonalError!, style: const TextStyle(fontSize: 11, color: AppColors.error))),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: AppSpacing.lg),

                    // 5. BOTTOM ACTIONS (Back + Continue)
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => context.pop(),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                            ),
                            child: const Text('Back', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          flex: 2,
                          child: AppPrimaryButton(
                            text: 'Continue →',
                            onPressed: _canContinue ? _onContinue : null,
                          ),
                        ),
                      ],
                    ),

                    // Guidance hint when Continue is disabled
                    if (!_canContinue) ...[
                      const SizedBox(height: 6),
                      Center(
                        child: Text(
                          detectedHub == null
                              ? 'Office location must be within HITEC City or Kokapet corridor'
                              : (_locality == null
                                  ? 'Select an employee locality to calculate route'
                                  : 'Please provide all required locations'),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: detectedHub == null ? AppColors.error : AppColors.warning,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDirectionBar(bool isDark, Color primaryText) {
    final isOutbound = _direction == 'OUTBOUND_FROM_OFFICE';
    return Container(
      height: 38,
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.slate200,
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight, width: 0.5),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => _setDirection('OUTBOUND_FROM_OFFICE'),
              child: Container(
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isOutbound ? AppColors.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.business_rounded,
                      size: 14,
                      color: isOutbound ? Colors.white : primaryText,
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_rounded,
                      size: 12,
                      color: isOutbound ? Colors.white : primaryText,
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.home_rounded,
                      size: 14,
                      color: isOutbound ? Colors.white : primaryText,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Office → Home',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isOutbound ? FontWeight.bold : FontWeight.w500,
                        color: isOutbound ? Colors.white : primaryText,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => _setDirection('INBOUND_TO_OFFICE'),
              child: Container(
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: !isOutbound ? AppColors.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.home_rounded,
                      size: 14,
                      color: !isOutbound ? Colors.white : primaryText,
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_rounded,
                      size: 12,
                      color: !isOutbound ? Colors.white : primaryText,
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.business_rounded,
                      size: 14,
                      color: !isOutbound ? Colors.white : primaryText,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Home → Office',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: !isOutbound ? FontWeight.bold : FontWeight.w500,
                        color: !isOutbound ? Colors.white : primaryText,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUnifiedRouteCard({
    required bool isDark,
    required Color primaryText,
    required Color mutedText,
    required String? detectedHub,
    required String officeAddress,
    required bool isOfficeOutside,
    required String employeeAddress,
  }) {
    final pickupIsOffice = _isOfficePickup;

    final officeTitle = _officeAddress.isNotEmpty
        ? (detectedHub != null ? OfficeHubDetector.hubDisplayName(detectedHub) : _officeAddress.split(',').first.trim())
        : 'Tap to select approved office hub';
    final officeSubtitle = detectedHub != null
        ? (detectedHub == OfficeHubDetector.hitecId ? 'HITEC City / Nanakramguda' : 'Kokapet SEZ / Neopolis')
        : (isOfficeOutside ? 'Outside service corridor' : 'Official Corporate Office Hub');

    final employeeTitle = _locality != null
        ? '${_locality!['name']} (${_locality!['zoneLabel']})'
        : 'Select Employee Locality';
    final employeeSubtitle = _locality != null
        ? 'Verified Locality • Fixed Fare'
        : 'Tap to select from 100+ verified areas';

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isOfficeOutside ? AppColors.error : (isDark ? AppColors.borderDark : AppColors.borderLight),
        ),
      ),
      child: Column(
        children: [
          // ── STOP 1: ALWAYS PICKUP LOCATION ──
          InkWell(
            onTap: pickupIsOffice ? _openOfficeLocationPicker : _openEmployeeLocationPicker,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'PICKUP LOCATION (STOP 1)',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: mutedText,
                                letterSpacing: 0.6,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: (pickupIsOffice ? AppColors.primary : AppColors.accentPurple).withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                pickupIsOffice ? 'Office Hub' : 'Employee Home',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: pickupIsOffice ? AppColors.primary : AppColors.accentPurple,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          pickupIsOffice ? officeTitle : employeeTitle,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: (!pickupIsOffice && _locality == null) ? AppColors.accentPurple : primaryText,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          pickupIsOffice ? officeSubtitle : employeeSubtitle,
                          style: TextStyle(
                            fontSize: 11,
                            color: (pickupIsOffice && isOfficeOutside) ? AppColors.error : mutedText,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(Icons.chevron_right_rounded, size: 18, color: mutedText),
                ],
              ),
            ),
          ),

          // ── CONNECTOR LINE ──
          Padding(
            padding: const EdgeInsets.only(left: 18),
            child: Row(
              children: [
                Container(
                  width: 2,
                  height: 12,
                  color: isDark ? AppColors.slate700 : AppColors.slate300,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Divider(
                    height: 1,
                    thickness: 0.5,
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
              ],
            ),
          ),

          // ── STOP 2: ALWAYS DESTINATION LOCATION ──
          InkWell(
            onTap: !pickupIsOffice ? _openOfficeLocationPicker : _openEmployeeLocationPicker,
            borderRadius: BorderRadius.vertical(
              bottom: Radius.circular((_locality != null && _routeResult != null) ? 0 : AppRadius.lg),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: AppColors.error,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'DESTINATION LOCATION (STOP 2)',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: mutedText,
                                letterSpacing: 0.6,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: (!pickupIsOffice ? AppColors.primary : AppColors.accentPurple).withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                !pickupIsOffice ? 'Office Hub' : 'Employee Home',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: !pickupIsOffice ? AppColors.primary : AppColors.accentPurple,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          !pickupIsOffice ? officeTitle : employeeTitle,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: (pickupIsOffice && _locality == null) ? AppColors.accentPurple : primaryText,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          !pickupIsOffice ? officeSubtitle : employeeSubtitle,
                          style: TextStyle(
                            fontSize: 11,
                            color: (!pickupIsOffice && isOfficeOutside) ? AppColors.error : mutedText,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(Icons.chevron_right_rounded, size: 18, color: mutedText),
                ],
              ),
            ),
          ),

          // ── INLINE ROUTE DISTANCE & ETA (ONLY calculated & shown when BOTH locations are selected!) ──
          if (_isCalculatingRoute) ...[
            Divider(height: 1, thickness: 0.5, color: isDark ? AppColors.borderDark : AppColors.borderLight),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.05),
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(AppRadius.lg)),
              ),
              child: Row(
                children: [
                  const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2)),
                  const SizedBox(width: 8),
                  Text(
                    'Calculating road distance & ETA (40 km/h avg)...',
                    style: TextStyle(fontSize: 11, color: mutedText),
                  ),
                ],
              ),
            ),
          ] else if (_locality != null && detectedHub != null && _routeResult != null && _routeResult!.distanceKm > 0) ...[
            Divider(height: 1, thickness: 0.5, color: isDark ? AppColors.borderDark : AppColors.borderLight),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.06),
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(AppRadius.lg)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.directions_car_filled_rounded, size: 15, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text(
                    '${_routeResult!.formattedDistance} • ~${_routeResult!.formattedEta}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: primaryText,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '(40 km/h avg)',
                    style: TextStyle(fontSize: 10, color: mutedText, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildOptionsCard(bool isDark, Color primaryText, Color mutedText) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        children: [
          // Row 1: Trip Type
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Trip Type',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: primaryText),
                  ),
                ),
                Container(
                  height: 30,
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.bgDark : AppColors.slate200,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Row(
                    children: ['One Way', 'Round Trip'].map((type) {
                      final isSelected = _tripType == type;
                      return GestureDetector(
                        onTap: () => setState(() => _tripType = type),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(AppRadius.full),
                          ),
                          child: Text(
                            type,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                              color: isSelected ? Colors.white : primaryText,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),

          Divider(height: 1, thickness: 0.5, color: isDark ? AppColors.borderDark : AppColors.borderLight),

          // Row 2: Security Escort
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: Row(
              children: [
                const Icon(Icons.shield_outlined, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Row(
                    children: [
                      Text(
                        'Security Escort',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: primaryText),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: AppColors.accentPurple.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          '+₹400',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.accentPurple),
                        ),
                      ),
                    ],
                  ),
                ),
                Transform.scale(
                  scale: 0.8,
                  child: Switch(
                    value: _hasEscort,
                    activeThumbColor: AppColors.primary,
                    onChanged: (v) {
                      setState(() => _hasEscort = v);
                      _refreshZonalQuote();
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildZonalFareCard(bool isDark, Color primaryText, Color muted, String hubId) {
    final q = _zonalQuote!;
    final baseFare = (q['baseFare'] as num?)?.toDouble() ?? 500.0;
    final escortCharge = _hasEscort ? 400.0 : 0.0;
    final total = baseFare + escortCharge;
    final zoneLabel = _locality?['zoneLabel'] ?? '';

    return Container(
      margin: const EdgeInsets.only(top: AppSpacing.sm),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.verified_rounded, color: AppColors.success, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Fixed Rate ($zoneLabel) • No Surge',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.success),
                ),
                Text(
                  _hasEscort ? 'Base ₹${baseFare.toStringAsFixed(0)} + ₹400 Escort' : 'Fixed corporate zonal pricing',
                  style: TextStyle(fontSize: 10, color: muted),
                ),
              ],
            ),
          ),
          Text(
            '₹${total.toStringAsFixed(0)}',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.success),
          ),
        ],
      ),
    );
  }
}
