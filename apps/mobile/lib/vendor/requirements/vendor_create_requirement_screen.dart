import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class VendorCreateRequirementScreen extends StatefulWidget {
  const VendorCreateRequirementScreen({super.key});

  @override
  State<VendorCreateRequirementScreen> createState() => _VendorCreateRequirementScreenState();
}

class _VendorCreateRequirementScreenState extends State<VendorCreateRequirementScreen> {
  String _selectedVehicleType = 'Sedan';
  int _quantity = 10;
  final TextEditingController _specialRequestsController = TextEditingController();

  final List<Map<String, String>> _vehicleTypes = [
    {'title': 'Sedan', 'icon': 'directions_car'},
    {'title': 'SUV', 'icon': 'airport_shuttle'},
    {'title': 'Tempo Traveller', 'icon': 'directions_bus'},
  ];

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
        actions: [
          IconButton(
            onPressed: () => context.push(AppRoutes.vendorBulkPostingScreen),
            icon: const Icon(Icons.tune, color: Color(0xFF6C5CE7)),
          ),
        ],
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
                  final isActive = stepNum == 1;
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
                    // Vehicle Type Selector Cards
                    Text(
                      'Vehicle Type *',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    Row(
                      children: _vehicleTypes.map((vehicle) {
                        final isSelected = _selectedVehicleType == vehicle['title'];
                        return Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _selectedVehicleType = vehicle['title']!),
                            child: Container(
                              margin: const EdgeInsets.only(right: 8),
                              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? const Color(0xFF6C5CE7).withValues(alpha: 0.1)
                                    : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                border: Border.all(
                                  color: isSelected ? const Color(0xFF6C5CE7) : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                  width: isSelected ? 2 : 1,
                                ),
                              ),
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.directions_car,
                                    size: 32,
                                    color: isSelected ? const Color(0xFF6C5CE7) : Colors.grey,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    vehicle['title']!,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                      color: isSelected ? const Color(0xFF6C5CE7) : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Quantity Stepper
                    Text(
                      'Quantity *',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          IconButton(
                            onPressed: () {
                              if (_quantity > 1) setState(() => _quantity--);
                            },
                            icon: const Icon(Icons.remove, color: Color(0xFF6C5CE7)),
                          ),
                          Text(
                            '$_quantity',
                            style: AppTypography.h2(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          IconButton(
                            onPressed: () {
                              setState(() => _quantity++);
                            },
                            icon: const Icon(Icons.add, color: Color(0xFF6C5CE7)),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Special Requests (Optional)
                    Text(
                      'Special Requests (Optional)',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _specialRequestsController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: 'Any specific vehicle or driver requirements.',
                        hintStyle: TextStyle(fontSize: 13, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    // Continue Button -> Step 2
                    AppPrimaryButton(
                      text: 'Continue →',
                      onPressed: () => context.push(AppRoutes.vendorCreateRequirementStep2Screen),
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
