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

class UserCreateRequirementStep4Screen extends StatefulWidget {
  const UserCreateRequirementStep4Screen({super.key});

  @override
  State<UserCreateRequirementStep4Screen> createState() => _UserCreateRequirementStep4ScreenState();
}

class _UserCreateRequirementStep4ScreenState extends State<UserCreateRequirementStep4Screen> {
  late int _passengers;
  String? _selectedLuggage;
  late TextEditingController _additionalInfoController;
  final List<String> _stops = [];
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final draft = context.read<RequirementDraftProvider>();
      _passengers = draft.passengers;
      _selectedLuggage = draft.selectedLuggage;
      _additionalInfoController = TextEditingController(text: draft.additionalInfo);
      _stops.addAll(draft.additionalStops);
      _initialized = true;
    }
  }

  @override
  void dispose() {
    _additionalInfoController.dispose();
    super.dispose();
  }

  Future<void> _showAddStopPicker() async {
    final result = await context.push<Map<String, dynamic>>(
      AppRoutes.universalLocationPickerScreen,
      extra: {
        'title': 'Add Intermediate Stop',
      },
    );

    if (result != null && mounted) {
      final address = (result['fullAddress'] as String?) ?? (result['address'] as String?) ?? (result['title'] as String?) ?? '';
      if (address.isNotEmpty) {
        setState(() => _stops.add(address));
      }
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
                  final isActive = stepNum <= 4;
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
                    // Additional Stops (Optional) Header + Add Button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Additional Stops (Optional)',
                          style: AppTypography.h4(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: _showAddStopPicker,
                          icon: Icon(Icons.add, size: 16, color: AppColors.primary),
                          label: Text('+ Add Stop', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (_stops.isEmpty)
                      Text(
                        'No additional stops added',
                        style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                      )
                    else
                      Column(
                        children: _stops.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final stop = entry.value;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.place_outlined, size: 16, color: AppColors.primary),
                                const SizedBox(width: 8),
                                Expanded(child: Text('Stop ${idx + 1}: $stop', style: const TextStyle(fontSize: 13))),
                                IconButton(
                                  icon: const Icon(Icons.close, size: 16, color: AppColors.error),
                                  onPressed: () => setState(() => _stops.removeAt(idx)),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),

                    const SizedBox(height: AppSpacing.lg),

                    // Luggage / Capacity Dropdown
                    Text(
                      'Luggage / Capacity (Optional)',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedLuggage,
                          hint: const Text('Select luggage type'),
                          isExpanded: true,
                          dropdownColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          items: [
                            'Standard (2 Suitcases)',
                            'Heavy (4+ Bags)',
                            'Executive Briefcase Only',
                            'Cargo / Equipment Boxes',
                            'No Luggage',
                          ].map((type) => DropdownMenuItem(value: type, child: Text(type))).toList(),
                          onChanged: (val) => setState(() => _selectedLuggage = val),
                        ),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Passenger Details Stepper
                    Text(
                      'Passenger Details (Optional)',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 6),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Total Passengers per Vehicle', style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                          Row(
                            children: [
                              IconButton(
                                onPressed: () {
                                  if (_passengers > 1) setState(() => _passengers--);
                                },
                                icon: Icon(Icons.remove, color: AppColors.primary),
                              ),
                              Text('$_passengers', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              IconButton(
                                onPressed: () => setState(() => _passengers++),
                                icon: Icon(Icons.add, color: AppColors.primary),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Additional Information
                    Text(
                      'Additional Information / Special Notes',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _additionalInfoController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: 'Any additional instructions for dispatch, security, or driver verification',
                        hintStyle: TextStyle(fontSize: 13, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
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
                              draft.updateStep4(
                                passengers: _passengers,
                                selectedLuggage: _selectedLuggage,
                                additionalInfo: _additionalInfoController.text.trim(),
                                additionalStops: _stops,
                              );
                              context.push(AppRoutes.userReviewRequirementScreen);
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
