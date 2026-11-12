import 'dart:async';
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
import 'widgets/security_escort_toggle_card.dart';

class UserCreateRequirementStep2Screen extends StatefulWidget {
  const UserCreateRequirementStep2Screen({super.key});

  @override
  State<UserCreateRequirementStep2Screen> createState() => _UserCreateRequirementStep2ScreenState();
}

class _UserCreateRequirementStep2ScreenState extends State<UserCreateRequirementStep2Screen> {
  static const String _tripType = 'One Way';

  String _pickupAddress = '';
  double _pickupLat = 0.0;
  double _pickupLng = 0.0;
  bool _pickupIsOffice = false;
  late TextEditingController _pickupInstructions;

  String _dropAddress = '';
  double _dropLat = 0.0;
  double _dropLng = 0.0;
  bool _dropIsOffice = false;
  bool _hasEscort = false;
  double? _policyEscortFee;
  late TextEditingController _dropInstructions;

  bool _initialized = false;
  bool _isCalculatingRoute = false;
  RoadRouteResult? _routeResult;

  bool _loadingQuote = false;
  String? _quoteError;
  Map<String, dynamic>? _distanceQuote;
  Timer? _quoteExpiryTimer;
  int _secondsUntilExpiry = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final draft = context.read<RequirementDraftProvider>();
      _pickupInstructions = TextEditingController(text: draft.pickupInstructions);
      _dropInstructions = TextEditingController(text: draft.dropInstructions);

      _pickupAddress = draft.pickupLocation;
      _pickupLat = draft.pickupLat;
      _pickupLng = draft.pickupLng;
      _pickupIsOffice = draft.pickupIsOffice;

      _dropAddress = draft.dropLocation;
      _dropLat = draft.dropLat;
      _dropLng = draft.dropLng;
      _dropIsOffice = draft.dropIsOffice && !_pickupIsOffice;
      _hasEscort = draft.hasEscort;

      _distanceQuote = draft.quote;

      _initialized = true;

      WidgetsBinding.instance.addPostFrameCallback((_) {
        _loadEscortFeePolicy();
        _syncToDraft();
        if (_hasValidCoordinates) {
          _calculateAndFetchQuote();
        }
      });
    }
  }

  @override
  void dispose() {
    _pickupInstructions.dispose();
    _dropInstructions.dispose();
    _quoteExpiryTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadEscortFeePolicy() async {
    final fee = await UserService.instance.getEscortFee();
    if (fee != null && mounted) {
      setState(() => _policyEscortFee = fee);
    }
  }

  bool get _hasValidCoordinates =>
      _pickupLat != 0.0 &&
      _pickupLng != 0.0 &&
      _dropLat != 0.0 &&
      _dropLng != 0.0 &&
      !(_pickupLat == _dropLat && _pickupLng == _dropLng);

  bool get _canContinue {
    if (_pickupAddress.trim().isEmpty || _dropAddress.trim().isEmpty) return false;
    if (!_hasValidCoordinates) return false;
    if (_loadingQuote) return false;
    if (_distanceQuote == null || _distanceQuote!['quoteId'] == null) return false;
    return true;
  }

  Future<void> _calculateAndFetchQuote() async {
    if (!_hasValidCoordinates) {
      setState(() {
        _routeResult = null;
        _distanceQuote = null;
        _quoteError = null;
      });
      return;
    }

    setState(() {
      _isCalculatingRoute = true;
      _loadingQuote = true;
      _quoteError = null;
    });

    try {
      // 1. Calculate road routing via Google Maps
      final res = await LocationService.instance.calculateRoadRoute(
        startLat: _pickupLat,
        startLng: _pickupLng,
        endLat: _dropLat,
        endLng: _dropLng,
      );

      final distanceKm = res.distanceKm;
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

      // 2. Fetch server distance quote (PRD v1.0 dynamic distance engine)
      if (!mounted) return;
      final draft = context.read<RequirementDraftProvider>();
      final vehicleCategory = draft.vehicleType.trim().toUpperCase();

      final quote = await UserService.instance.createDistanceTripQuote(
        pickupLat: _pickupLat,
        pickupLng: _pickupLng,
        pickupAddress: _pickupAddress.trim(),
        dropLat: _dropLat,
        dropLng: _dropLng,
        dropAddress: _dropAddress.trim(),
        vehicleCategory: vehicleCategory,
        pickupIsOffice: _pickupIsOffice,
        dropIsOffice: _dropIsOffice,
        hasEscort: _hasEscort,
        pickupTime: draft.reportingDateTime,
      );

      if (mounted) {
        setState(() {
          _distanceQuote = quote;
          _loadingQuote = false;
          _quoteError = null;
        });
        _startExpiryCountdown(quote['expiresAt'] as String?);
        _syncToDraft();
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _distanceQuote = null;
          _loadingQuote = false;
          _quoteError = e.message;
        });
        _syncToDraft();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _distanceQuote = null;
          _loadingQuote = false;
          _quoteError = 'Distance quote unavailable. Please check your connection.';
        });
        _syncToDraft();
      }
    }
  }

  void _startExpiryCountdown(String? expiresAtStr) {
    _quoteExpiryTimer?.cancel();
    if (expiresAtStr == null) return;
    final expiresAt = DateTime.tryParse(expiresAtStr);
    if (expiresAt == null) return;

    final diffSec = expiresAt.difference(DateTime.now()).inSeconds;
    if (diffSec <= 0) {
      setState(() => _secondsUntilExpiry = 0);
      return;
    }

    setState(() => _secondsUntilExpiry = diffSec);
    _quoteExpiryTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final remaining = expiresAt.difference(DateTime.now()).inSeconds;
      if (remaining <= 0) {
        timer.cancel();
        setState(() {
          _secondsUntilExpiry = 0;
          _quoteError = 'Quote has expired. Refreshing...';
        });
        _calculateAndFetchQuote();
      } else {
        setState(() => _secondsUntilExpiry = remaining);
      }
    });
  }

  void _syncToDraft() {
    final draft = context.read<RequirementDraftProvider>();
    draft.setHasEscort(_hasEscort);
    draft.setQuote(_distanceQuote);
    draft.setOfficeLabels(pickupIsOffice: _pickupIsOffice, dropIsOffice: _dropIsOffice);
    draft.updateStep2(
      pickupLocation: _pickupAddress.trim(),
      pickupInstructions: _pickupInstructions.text.trim(),
      dropLocation: _dropAddress.trim(),
      dropInstructions: _dropInstructions.text.trim(),
      tripType: _tripType,
      pickupLat: _pickupLat,
      pickupLng: _pickupLng,
      dropLat: _dropLat,
      dropLng: _dropLng,
    );
  }

  void _swapLocations() {
    setState(() {
      final tempAddr = _pickupAddress;
      final tempLat = _pickupLat;
      final tempLng = _pickupLng;
      final tempOffice = _pickupIsOffice;
      final tempInst = _pickupInstructions.text;

      _pickupAddress = _dropAddress;
      _pickupLat = _dropLat;
      _pickupLng = _dropLng;
      _pickupIsOffice = _dropIsOffice;
      _pickupInstructions.text = _dropInstructions.text;

      _dropAddress = tempAddr;
      _dropLat = tempLat;
      _dropLng = tempLng;
      _dropIsOffice = tempOffice;
      _dropInstructions.text = tempInst;
    });

    _syncToDraft();
    _calculateAndFetchQuote();
  }

  Future<void> _pickLocation({required bool isPickup}) async {
    final result = await context.push<Map<String, dynamic>>(
      AppRoutes.universalLocationSearchScreen,
      extra: {
        'title': isPickup ? 'Select Pickup Location' : 'Select Drop Location',
        'initialAddress': isPickup ? _pickupAddress : _dropAddress,
        'initialLat': isPickup ? _pickupLat : _dropLat,
        'initialLng': isPickup ? _pickupLng : _dropLng,
      },
    );

    if (result != null && mounted) {
      final addr = (result['fullAddress'] as String?) ??
          (result['address'] as String?) ??
          (result['title'] as String?) ??
          '';
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

      _syncToDraft();
      _calculateAndFetchQuote();
    }
  }

  void _onContinue() {
    if (!_canContinue) return;

    final draft = context.read<RequirementDraftProvider>();
    draft.updateStep2(
      pickupLocation: _pickupAddress.trim(),
      pickupInstructions: _pickupInstructions.text.trim(),
      dropLocation: _dropAddress.trim(),
      dropInstructions: _dropInstructions.text.trim(),
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

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: primaryText),
        ),
        title: Text(
          'Select Route & Locations',
          style: AppTypography.h3(
            color: primaryText,
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
                          'Pickup & Drop Locations',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: primaryText),
                        ),
                        TextButton.icon(
                          onPressed: _hasValidCoordinates ? _swapLocations : null,
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

                    const SizedBox(height: 8),

                    // 1. UNIFIED CONNECTED ROUTE CARD
                    _buildConnectedRouteCard(isDark, primaryText, mutedText),

                    const SizedBox(height: 12),

                    // 2. SECURITY ESCORT TOGGLE
                    SecurityEscortToggleCard(
                      hasEscort: _hasEscort,
                      escortFeeRupees: _hasEscort
                          ? ((_distanceQuote?['escortFareRupees'] as num?)?.toDouble() ?? _policyEscortFee)
                          : _policyEscortFee,
                      onChanged: (val) {
                        setState(() {
                          _hasEscort = val;
                          _distanceQuote = null;
                        });
                        _syncToDraft();
                        if (_hasValidCoordinates) {
                          _calculateAndFetchQuote();
                        }
                      },
                    ),

                    const SizedBox(height: 12),

                    // 3. DYNAMIC DISTANCE PRICING CARD (PRD v1.0)
                    if (_isCalculatingRoute || _loadingQuote) ...[
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Center(
                          child: Column(
                            children: [
                              CircularProgressIndicator(strokeWidth: 2),
                              SizedBox(height: 8),
                              Text('Calculating route distance and guaranteed fare...', style: TextStyle(fontSize: 12)),
                            ],
                          ),
                        ),
                      ),
                    ] else if (_distanceQuote != null) ...[
                      _buildDistanceQuoteCard(isDark, primaryText, mutedText),
                    ] else if (_quoteError != null) ...[
                      Container(
                        margin: const EdgeInsets.only(top: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _quoteError!,
                                style: const TextStyle(fontSize: 12, color: AppColors.error, fontWeight: FontWeight.w500),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: AppSpacing.xl),

                    // 4. BOTTOM ACTIONS (Back + Continue)
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => context.pop(),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 13),
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

                    if (!_canContinue) ...[
                      const SizedBox(height: 8),
                      Center(
                        child: Text(
                          _pickupAddress.isEmpty
                              ? 'Select a pickup location to begin'
                              : (_dropAddress.isEmpty
                                  ? 'Select a drop location to calculate distance'
                                  : (_loadingQuote
                                      ? 'Resolving pricing slab...'
                                      : (_quoteError != null
                                          ? 'Route exceeds available pricing bands'
                                          : 'Select locations to get quote'))),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: _quoteError != null ? AppColors.error : AppColors.warning,
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

  void _toggleOffice({required bool isPickup}) {
    setState(() {
      if (isPickup) {
        _pickupIsOffice = !_pickupIsOffice;
        if (_pickupIsOffice) _dropIsOffice = false;
      } else {
        _dropIsOffice = !_dropIsOffice;
        if (_dropIsOffice) _pickupIsOffice = false;
      }
    });
    _syncToDraft();
  }

  Widget _buildOfficeChip({
    required bool isPickup,
    required bool isOffice,
    required bool isDark,
    required Color mutedText,
  }) {
    return InkWell(
      onTap: () => _toggleOffice(isPickup: isPickup),
      borderRadius: BorderRadius.circular(4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: isOffice
              ? AppColors.primary.withValues(alpha: 0.15)
              : (isDark ? AppColors.slate800 : AppColors.slate200),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(
            color: isOffice
                ? AppColors.primary
                : (isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.business_rounded,
              size: 11,
              color: isOffice ? AppColors.primary : mutedText,
            ),
            const SizedBox(width: 3),
            Text(
              isOffice ? 'Office' : 'Mention as Office',
              style: TextStyle(
                fontSize: 10,
                fontWeight: isOffice ? FontWeight.bold : FontWeight.w500,
                color: isOffice ? AppColors.primary : mutedText,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConnectedRouteCard(bool isDark, Color primaryText, Color mutedText) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        children: [
          // ── STOP 1: PICKUP LOCATION ──
          InkWell(
            onTap: () => _pickLocation(isPickup: true),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
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
                              'PICKUP LOCATION',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: mutedText,
                                letterSpacing: 0.6,
                              ),
                            ),
                            const Spacer(),
                            // Optional "Mention as Office" Chip
                            _buildOfficeChip(
                              isPickup: true,
                              isOffice: _pickupIsOffice,
                              isDark: isDark,
                              mutedText: mutedText,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _pickupAddress.isNotEmpty ? _pickupAddress : 'Tap to select pickup point',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: _pickupAddress.isNotEmpty ? primaryText : AppColors.primary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _pickupInstructions,
                          onChanged: (_) => _syncToDraft(),
                          decoration: InputDecoration(
                            isDense: true,
                            hintText: 'Landmark / Gate / Tower (e.g. Bldg 3, Gate 1)',
                            hintStyle: TextStyle(fontSize: 10, color: mutedText),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                              borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                          ),
                          style: const TextStyle(fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(Icons.chevron_right_rounded, size: 20, color: mutedText),
                ],
              ),
            ),
          ),

          // ── CONNECTOR LINE & INLINE ROUTE ──
          Padding(
            padding: const EdgeInsets.only(left: 18),
            child: Row(
              children: [
                Container(
                  width: 2,
                  height: 16,
                  color: isDark ? AppColors.slate700 : AppColors.slate300,
                ),
                const SizedBox(width: 14),
                if (_routeResult != null && _routeResult!.distanceKm > 0) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.directions_car_rounded, size: 12, color: AppColors.primary),
                        const SizedBox(width: 4),
                        Text(
                          '${_routeResult!.formattedDistance} • ~${_routeResult!.formattedEta}',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
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

          // ── STOP 2: DROP LOCATION ──
          InkWell(
            onTap: () => _pickLocation(isPickup: false),
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(AppRadius.lg)),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
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
                              'DROP LOCATION',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: mutedText,
                                letterSpacing: 0.6,
                              ),
                            ),
                            const Spacer(),
                            // Optional "Mention as Office" Chip
                            _buildOfficeChip(
                              isPickup: false,
                              isOffice: _dropIsOffice,
                              isDark: isDark,
                              mutedText: mutedText,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _dropAddress.isNotEmpty ? _dropAddress : 'Tap to select drop point',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: _dropAddress.isNotEmpty ? primaryText : AppColors.primary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _dropInstructions,
                          onChanged: (_) => _syncToDraft(),
                          decoration: InputDecoration(
                            isDense: true,
                            hintText: 'Landmark / Flat / Gate (e.g. Near SBI ATM)',
                            hintStyle: TextStyle(fontSize: 10, color: mutedText),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                              borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                          ),
                          style: const TextStyle(fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(Icons.chevron_right_rounded, size: 20, color: mutedText),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDistanceQuoteCard(bool isDark, Color primaryText, Color muted) {
    final q = _distanceQuote!;
    final vendorRupees = (q['vendorPriceRupees'] as num?)?.toDouble() ??
        ((q['vendorPricePaise'] as num?) != null ? (q['vendorPricePaise'] as num) / 100.0 : 0.0);
    final totalFare = vendorRupees;
    final slabLabel = q['planVersion'] != null ? 'Plan ${q['planVersion']}' : 'Distance Slab';
    final displayKm = (q['displayedKm'] is num)
        ? '${(q['displayedKm'] as num).toStringAsFixed(1)} km'
        : (_routeResult != null ? _routeResult!.formattedDistance : '');

    return Container(
      margin: const EdgeInsets.only(top: AppSpacing.sm),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.verified_rounded, color: AppColors.success, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Guaranteed Trip Price',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.success),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: AppColors.success.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            slabLabel,
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.success),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      (_hasEscort && ((q['escortFareRupees'] as num?)?.toDouble() ?? 0) > 0)
                          ? 'Base ₹${(((q['baseVendorPriceRupees'] as num?)?.toDouble()) ?? (totalFare - (q['escortFareRupees'] as num).toDouble())).toStringAsFixed(0)} + ₹${(q['escortFareRupees'] as num).toStringAsFixed(0)} Escort • $displayKm'
                          : 'Google Maps route: $displayKm • Fixed rate band • Zero surge',
                      style: TextStyle(fontSize: 11, color: muted),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '₹${totalFare.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.success),
                  ),
                  if (_secondsUntilExpiry > 0)
                    Text(
                      'Expires in ${_secondsUntilExpiry ~/ 60}:${(_secondsUntilExpiry % 60).toString().padLeft(2, '0')}',
                      style: const TextStyle(fontSize: 10, color: AppColors.slate500, fontWeight: FontWeight.w600),
                    ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Distance is calculated by Google Maps Platform Routes API and compared using unrounded meters. Changes made in the rate card apply to newly priced bookings.',
            style: TextStyle(fontSize: 10, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }
}
