import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
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

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final draft = context.read<RequirementDraftProvider>();
      _tripType = draft.tripType;
      _pickupController = TextEditingController(text: draft.pickupLocation);
      _pickupInstructions = TextEditingController(text: draft.pickupInstructions);
      _dropController = TextEditingController(text: draft.dropLocation);
      _dropInstructions = TextEditingController(text: draft.dropInstructions);
      _pickupLat = draft.pickupLat;
      _pickupLng = draft.pickupLng;
      _dropLat = draft.dropLat;
      _dropLng = draft.dropLng;
      _initialized = true;
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

  Future<void> _openLocationPicker({required bool isPickup}) async {
    final title = isPickup ? 'Select Pickup Location' : 'Select Destination';
    final initialAddress = isPickup ? _pickupController.text : _dropController.text;
    final initialLat = isPickup ? _pickupLat : _dropLat;
    final initialLng = isPickup ? _pickupLng : _dropLng;

    final result = await context.push<Map<String, dynamic>>(
      AppRoutes.universalLocationPickerScreen,
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
    }
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
            // Stepper Header (1, 2, 3, 4, 5)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(5, (index) {
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
                    // Pickup Location Section
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Pickup Location *',
                          style: AppTypography.h4(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () => _openLocationPicker(isPickup: true),
                          icon: Icon(Icons.map_rounded, size: 16, color: AppColors.primary),
                          label: Text(
                            'Open Map Picker',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    InkWell(
                      onTap: () => _openLocationPicker(isPickup: true),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      child: IgnorePointer(
                        child: TextField(
                          controller: _pickupController,
                          decoration: InputDecoration(
                            hintText: 'Search or select pickup address',
                            prefixIcon: Icon(Icons.location_on_rounded, color: AppColors.primary),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.tune_rounded, color: AppColors.primary),
                              onPressed: () => _openLocationPicker(isPickup: true),
                            ),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _pickupInstructions,
                      style: const TextStyle(fontSize: 12),
                      decoration: const InputDecoration(
                        hintText: 'Add pickup notes (e.g. Gate 2, Near Tower B lobby)',
                        border: InputBorder.none,
                        isDense: true,
                      ),
                    ),

                    const SizedBox(height: AppSpacing.md),

                    // Destination Section
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Destination *',
                          style: AppTypography.h4(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () => _openLocationPicker(isPickup: false),
                          icon: Icon(Icons.map_rounded, size: 16, color: AppColors.accentPurple),
                          label: Text(
                            'Open Map Picker',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.accentPurple),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    InkWell(
                      onTap: () => _openLocationPicker(isPickup: false),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      child: IgnorePointer(
                        child: TextField(
                          controller: _dropController,
                          decoration: InputDecoration(
                            hintText: 'Search or select drop location',
                            prefixIcon: Icon(Icons.pin_drop_rounded, color: AppColors.accentPurple),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.tune_rounded, color: AppColors.accentPurple),
                              onPressed: () => _openLocationPicker(isPickup: false),
                            ),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _dropInstructions,
                      style: const TextStyle(fontSize: 12),
                      decoration: const InputDecoration(
                        hintText: 'Add drop notes (e.g. Departures Gate 5, Parking slot 3)',
                        border: InputBorder.none,
                        isDense: true,
                      ),
                    ),

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
                              final draft = context.read<RequirementDraftProvider>();
                              draft.updateStep2(
                                pickupLocation: _pickupController.text.trim(),
                                pickupInstructions: _pickupInstructions.text.trim(),
                                dropLocation: _dropController.text.trim(),
                                dropInstructions: _dropInstructions.text.trim(),
                                tripType: _tripType,
                                pickupLat: _pickupLat,
                                pickupLng: _pickupLng,
                                dropLat: _dropLat,
                                dropLng: _dropLng,
                              );
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
}
