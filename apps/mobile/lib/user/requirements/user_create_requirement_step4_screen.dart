import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserCreateRequirementStep4Screen extends StatefulWidget {
  const UserCreateRequirementStep4Screen({super.key});

  @override
  State<UserCreateRequirementStep4Screen> createState() => _UserCreateRequirementStep4ScreenState();
}

class _UserCreateRequirementStep4ScreenState extends State<UserCreateRequirementStep4Screen> {
  int _passengers = 1;
  String? _selectedLuggage;
  final TextEditingController _additionalInfoController = TextEditingController();

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
                    backgroundColor: isActive ? const Color(0xFF6C5CE7) : (isDark ? Colors.grey[800] : Colors.grey[300]),
                    child: Text(
                      '$stepNum',
                      style: TextStyle(
                        fontSize: 12,
                        color: isActive ? Colors.white : Colors.grey[600],
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
                          onPressed: () {},
                          icon: const Icon(Icons.add, size: 16, color: Color(0xFF6C5CE7)),
                          label: const Text('+ Add Stop', style: TextStyle(color: Color(0xFF6C5CE7), fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'No additional stops added',
                      style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
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
                          items: ['Standard (2 Suitcases)', 'Heavy (4+ Bags)', 'No Luggage']
                              .map((type) => DropdownMenuItem(value: type, child: Text(type)))
                              .toList(),
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
                          Text('Total Passengers', style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                          Row(
                            children: [
                              IconButton(
                                onPressed: () {
                                  if (_passengers > 1) setState(() => _passengers--);
                                },
                                icon: const Icon(Icons.remove, color: Color(0xFF6C5CE7)),
                              ),
                              Text('$_passengers', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              IconButton(
                                onPressed: () => setState(() => _passengers++),
                                icon: const Icon(Icons.add, color: Color(0xFF6C5CE7)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Additional Information
                    Text(
                      'Additional Information',
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
                        hintText: 'Any additional information for better fulfillment',
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
                            onPressed: () => context.push(AppRoutes.userReviewRequirementScreen),
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
