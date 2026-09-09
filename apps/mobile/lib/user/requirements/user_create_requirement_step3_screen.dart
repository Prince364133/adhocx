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

class UserCreateRequirementStep3Screen extends StatefulWidget {
  const UserCreateRequirementStep3Screen({super.key});

  @override
  State<UserCreateRequirementStep3Screen> createState() => _UserCreateRequirementStep3ScreenState();
}

class _UserCreateRequirementStep3ScreenState extends State<UserCreateRequirementStep3Screen> {
  late bool _hasReturn;
  late TextEditingController _dateController;
  late TextEditingController _timeController;
  late TextEditingController _returnDateController;
  late TextEditingController _returnTimeController;
  DateTime? _selectedDateTime;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final draft = context.read<RequirementDraftProvider>();
      _hasReturn = draft.hasReturn;
      _dateController = TextEditingController(text: draft.pickupDate);
      _timeController = TextEditingController(text: draft.pickupTime);
      _returnDateController = TextEditingController(text: draft.returnDate ?? '');
      _returnTimeController = TextEditingController(text: draft.returnTime ?? '');
      _selectedDateTime = draft.reportingDateTime;
      _initialized = true;
    }
  }

  @override
  void dispose() {
    _dateController.dispose();
    _timeController.dispose();
    _returnDateController.dispose();
    _returnTimeController.dispose();
    super.dispose();
  }

  Future<void> _pickDate(BuildContext context, TextEditingController controller) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) {
      final dateStr = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      setState(() {
        controller.text = dateStr;
      });
    }
  }

  Future<void> _pickTime(BuildContext context, TextEditingController controller) async {
    final now = TimeOfDay.now();
    final picked = await showTimePicker(
      context: context,
      initialTime: now,
    );
    if (picked != null) {
      final hour = picked.hour;
      final minute = picked.minute.toString().padLeft(2, '0');
      final period = hour >= 12 ? 'PM' : 'AM';
      final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
      final timeStr = '${displayHour.toString().padLeft(2, '0')}:$minute $period';
      setState(() {
        controller.text = timeStr;
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
                  final isActive = stepNum <= 3;
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
                      readOnly: true,
                      onTap: () => _pickDate(context, _dateController),
                      decoration: InputDecoration(
                        suffixIcon: IconButton(
                          icon: Icon(Icons.calendar_today_outlined, color: AppColors.primary),
                          onPressed: () => _pickDate(context, _dateController),
                        ),
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
                      readOnly: true,
                      onTap: () => _pickTime(context, _timeController),
                      decoration: InputDecoration(
                        suffixIcon: IconButton(
                          icon: Icon(Icons.access_time_outlined, color: AppColors.primary),
                          onPressed: () => _pickTime(context, _timeController),
                        ),
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
                          activeColor: AppColors.primary,
                          onChanged: (val) => setState(() => _hasReturn = val),
                        ),
                      ],
                    ),

                    if (_hasReturn) ...[
                      const SizedBox(height: 6),
                      TextField(
                        controller: _returnDateController,
                        readOnly: true,
                        onTap: () => _pickDate(context, _returnDateController),
                        decoration: InputDecoration(
                          hintText: 'Select return date',
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.calendar_today_outlined),
                            onPressed: () => _pickDate(context, _returnDateController),
                          ),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _returnTimeController,
                        readOnly: true,
                        onTap: () => _pickTime(context, _returnTimeController),
                        decoration: InputDecoration(
                          hintText: 'Select return time',
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.access_time_outlined),
                            onPressed: () => _pickTime(context, _returnTimeController),
                          ),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        ),
                      ),
                    ],

                    const SizedBox(height: AppSpacing.lg),

                    // Info Note Container Banner
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline, color: AppColors.primary, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Note: Drivers will be dispatched progressively based on vehicle type, location, and scheduled departure time.',
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
                            onPressed: () {
                              final draft = context.read<RequirementDraftProvider>();
                              draft.updateStep3(
                                pickupDate: _dateController.text.trim(),
                                pickupTime: _timeController.text.trim(),
                                hasReturn: _hasReturn,
                                returnDate: _hasReturn ? _returnDateController.text.trim() : null,
                                returnTime: _hasReturn ? _returnTimeController.text.trim() : null,
                              );
                              context.push(AppRoutes.userCreateRequirementStep4Screen);
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
