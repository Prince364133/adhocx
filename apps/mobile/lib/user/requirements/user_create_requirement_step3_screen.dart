import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserCreateRequirementStep3Screen extends StatefulWidget {
  const UserCreateRequirementStep3Screen({super.key});

  @override
  State<UserCreateRequirementStep3Screen> createState() => _UserCreateRequirementStep3ScreenState();
}

class _UserCreateRequirementStep3ScreenState extends State<UserCreateRequirementStep3Screen> {
  bool _hasReturn = false;
  final TextEditingController _dateController = TextEditingController(text: '10 May 2025');
  final TextEditingController _timeController = TextEditingController(text: '06:30 PM');
  final TextEditingController _returnDateController = TextEditingController();
  final TextEditingController _returnTimeController = TextEditingController();

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
                  final isActive = stepNum <= 3;
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
                    // Pickup Date
                    Text(
                      'Pickup Date *',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _dateController,
                      decoration: InputDecoration(
                        suffixIcon: const Icon(Icons.calendar_today_outlined, color: Color(0xFF6C5CE7)),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.md),

                    // Pickup Time
                    Text(
                      'Pickup Time *',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _timeController,
                      decoration: InputDecoration(
                        suffixIcon: const Icon(Icons.access_time_outlined, color: Color(0xFF6C5CE7)),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Return (Optional) Switch Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Return (Optional)',
                          style: AppTypography.h4(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Switch(
                          value: _hasReturn,
                          activeColor: const Color(0xFF6C5CE7),
                          onChanged: (val) => setState(() => _hasReturn = val),
                        ),
                      ],
                    ),

                    if (_hasReturn) ...[
                      const SizedBox(height: 6),
                      TextField(
                        controller: _returnDateController,
                        decoration: InputDecoration(
                          hintText: 'Select return date',
                          suffixIcon: const Icon(Icons.calendar_today_outlined),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _returnTimeController,
                        decoration: InputDecoration(
                          hintText: 'Return time',
                          suffixIcon: const Icon(Icons.access_time_outlined),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        ),
                      ),
                    ],

                    const SizedBox(height: AppSpacing.lg),

                    // Info Note Container Banner
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6C5CE7).withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: const Color(0xFF6C5CE7).withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline, color: Color(0xFF6C5CE7), size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Note: Drivers will be assigned based on availability for the selected date & time.',
                              style: TextStyle(fontSize: 12, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                            ),
                          ),
                        ],
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
                            onPressed: () => context.push(AppRoutes.userCreateRequirementStep4Screen),
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
