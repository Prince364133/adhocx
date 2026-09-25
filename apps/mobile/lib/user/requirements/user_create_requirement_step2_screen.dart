import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/location_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import 'requirement_draft_provider.dart';

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
  double _pickupLat = 28.4950;
  double _pickupLng = 77.0895;
  double _dropLat = 28.5562;
  double _dropLng = 77.1000;
  bool _initialized = false;
  bool _isCalculatingRoute = false;
  RoadRouteResult? _routeResult;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final draft = context.read<RequirementDraftProvider>();
      _tripType = draft.tripType;
      _pickupController = TextEditingController(
        text: draft.pickupLocation,
      );
      _pickupInstructions = TextEditingController(text: draft.pickupInstructions);
      _dropController = TextEditingController(
        text: draft.dropLocation,
      );
      _dropInstructions = TextEditingController(text: draft.dropInstructions);
      _pickupLat = draft.pickupLat;
      _pickupLng = draft.pickupLng;
      _dropLat = draft.dropLat;
      _dropLng = draft.dropLng;
      _initialized = true;

      if (_pickupLat != 0.0 && _dropLat != 0.0 && (_pickupLat != _dropLat || _pickupLng != _dropLng)) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _calculateAndSyncRoute();
        });
      }
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

  Future<void> _calculateAndSyncRoute() async {
    if (_pickupLat != 0.0 && _dropLat != 0.0 && (_pickupLat != _dropLat || _pickupLng != _dropLng)) {
      setState(() => _isCalculatingRoute = true);
      try {
        final res = await LocationService.instance.calculateRoadRoute(
          startLat: _pickupLat,
          startLng: _pickupLng,
          endLat: _dropLat,
          endLng: _dropLng,
        );
        if (mounted) {
          setState(() {
            _routeResult = res;
            _isCalculatingRoute = false;
          });
          context.read<RequirementDraftProvider>().setRoadRoute(
            distanceKm: res.distanceKm,
            durationMinutes: res.durationMinutes,
            formattedDistance: res.formattedDistance,
            formattedEta: res.formattedEta,
          );
        }
      } catch (_) {
        if (mounted) setState(() => _isCalculatingRoute = false);
      }
    }
  }

  Future<void> _openLocationSearch({required bool isPickup}) async {
    final title = isPickup ? 'Select Pickup Location' : 'Select Destination';
    final initialAddress = isPickup ? _pickupController.text : _dropController.text;
    final initialLat = isPickup ? _pickupLat : _dropLat;
    final initialLng = isPickup ? _pickupLng : _dropLng;

    final result = await context.push<Map<String, dynamic>>(
      AppRoutes.universalLocationSearchScreen,
      extra: {
        'title': title,
        'initialAddress': initialAddress,
        'initialLat': initialLat,
        'initialLng': initialLng,
      },
    );

    if (result != null && mounted) {
      final address = (result['fullAddress'] as String?) ?? (result['address'] as String?) ?? (result['title'] as String?) ?? '';
      final lat = (result['latitude'] as num?)?.toDouble() ?? 28.4950;
      final lng = (result['longitude'] as num?)?.toDouble() ?? 77.0895;

      setState(() {
        if (isPickup) {
          _pickupController.text = address;
          _pickupLat = lat;
          _pickupLng = lng;
        } else {
          _dropController.text = address;
          _dropLat = lat;
          _dropLng = lng;
        }
      });

      _calculateAndSyncRoute();
    }
  }

  void _swapLocations() {
    setState(() {
      final tempText = _pickupController.text;
      final tempLat = _pickupLat;
      final tempLng = _pickupLng;

      _pickupController.text = _dropController.text;
      _pickupLat = _dropLat;
      _pickupLng = _dropLng;

      _dropController.text = tempText;
      _dropLat = tempLat;
      _dropLng = tempLng;
    });

    _calculateAndSyncRoute();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

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
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Section Title with Swap action
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Route & Locations *',
                          style: AppTypography.h4(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: _swapLocations,
                          icon: const Icon(Icons.swap_vert_rounded, size: 16),
                          label: const Text('Swap Pickup / Drop', style: TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),

                    const SizedBox(height: 6),

                    // Pickup Location Card
                    _buildLocationCard(
                      label: 'Pickup Location *',
                      address: _pickupController.text.isNotEmpty ? _pickupController.text : 'Tap to search pickup address',
                      icon: Icons.my_location_rounded,
                      iconColor: AppColors.primary,
                      onTap: () => _openLocationSearch(isPickup: true),
                      isDark: isDark,
                    ),

                    const SizedBox(height: AppSpacing.md),

                    // Destination Location Card
                    _buildLocationCard(
                      label: 'Destination / Drop Location *',
                      address: _dropController.text.isNotEmpty ? _dropController.text : 'Tap to search drop address',
                      icon: Icons.pin_drop_rounded,
                      iconColor: AppColors.accentPurple,
                      onTap: () => _openLocationSearch(isPickup: false),
                      isDark: isDark,
                    ),

                    // Road-based distance & ETA status card via OpenStreetMap (OSRM)
                    if (_isCalculatingRoute) ...[
                      Container(
                        margin: const EdgeInsets.only(top: AppSpacing.md),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: Row(
                          children: [
                            const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Calculating road distance & ETA via OpenStreetMap...',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ] else if (_routeResult != null && _routeResult!.distanceKm > 0) ...[
                      Container(
                        margin: const EdgeInsets.only(top: AppSpacing.md),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.directions_car_rounded, size: 14, color: Colors.white),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${_routeResult!.formattedDistance} • ~${_routeResult!.formattedEta}',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Road-based route calculated via OpenStreetMap',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: AppSpacing.lg),

                    // Trip Type Segmented Button (One Way vs Round Trip)
                    Text(
                      'Trip Type',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.slate200,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        children: ['One Way', 'Round Trip'].map((type) {
                          final isSelected = _tripType == type;
                          return Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _tripType = type),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  color: isSelected ? AppColors.primary : Colors.transparent,
                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                ),
                                child: Text(
                                  type,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    // Bottom Actions (Back + Continue)
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => context.pop(),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
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
                            onPressed: () {
                              if (_pickupController.text.trim().isEmpty || _dropController.text.trim().isEmpty) {
                                Fluttertoast.showToast(
                                  msg: 'Please select both pickup and destination locations',
                                  backgroundColor: AppColors.error,
                                  textColor: Colors.white,
                                );
                                return;
                              }

                              final draft = context.read<RequirementDraftProvider>();
                              draft.updateStep2(
                                pickupLocation: _pickupController.text.trim(),
                                pickupInstructions: '',
                                dropLocation: _dropController.text.trim(),
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
                              context.push(AppRoutes.userCreateRequirementStep3Screen);
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationCard({
    required String label,
    required String address,
    required IconData icon,
    required Color iconColor,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    final title = address.split(',').first.trim();
    final subtitle = address.contains(',') ? address.substring(address.indexOf(',') + 1).trim() : 'OpenStreetMap Location';

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: iconColor,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    subtitle,
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
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.search_rounded, size: 14, color: AppColors.primary),
                  const SizedBox(width: 4),
                  Text(
                    'Search',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
