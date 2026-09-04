import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserCreateRequirementStep2Screen extends StatefulWidget {
  const UserCreateRequirementStep2Screen({super.key});

  @override
  State<UserCreateRequirementStep2Screen> createState() => _UserCreateRequirementStep2ScreenState();
}

class _UserCreateRequirementStep2ScreenState extends State<UserCreateRequirementStep2Screen> {
  String _tripType = 'One Way';
  final TextEditingController _pickupController = TextEditingController(text: 'DLF Cyber City, Gurugram');
  final TextEditingController _pickupInstructions = TextEditingController();
  final TextEditingController _dropController = TextEditingController(text: 'Indira Gandhi Airport, Delhi');
  final TextEditingController _dropInstructions = TextEditingController();

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
                    // Pickup Location
                    Text(
                      'Pickup Location *',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _pickupController,
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.location_on_outlined, color: Color(0xFF6C5CE7)),
                        suffixIcon: const Icon(Icons.my_location, color: Colors.grey),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _pickupInstructions,
                      style: const TextStyle(fontSize: 12),
                      decoration: const InputDecoration(
                        hintText: 'Add instructions for driver',
                        border: InputBorder.none,
                        isDense: true,
                      ),
                    ),

                    const SizedBox(height: AppSpacing.md),

                    // Destination
                    Text(
                      'Destination *',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _dropController,
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.pin_drop_outlined, color: Color(0xFF6C5CE7)),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _dropInstructions,
                      style: const TextStyle(fontSize: 12),
                      decoration: const InputDecoration(
                        hintText: 'Add instructions for driver',
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
                        color: isDark ? AppColors.surfaceDark : Colors.grey[200],
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
                                  color: isSelected ? const Color(0xFF6C5CE7) : Colors.transparent,
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
                            onPressed: () => context.push(AppRoutes.userCreateRequirementStep3Screen),
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
