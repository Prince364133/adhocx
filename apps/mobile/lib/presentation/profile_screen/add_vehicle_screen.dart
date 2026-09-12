import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

/// Screen 3: Add / Replace Vehicle matching exact design guidelines.
class AddVehicleScreen extends StatefulWidget {
  const AddVehicleScreen({super.key});

  @override
  State<AddVehicleScreen> createState() => _AddVehicleScreenState();
}

class _AddVehicleScreenState extends State<AddVehicleScreen> {
  final _makeModelController = TextEditingController(text: 'Honda City');
  final _plateController = TextEditingController(text: 'HR 26 AB 1234');
  final _yearController = TextEditingController(text: '2022');
  final _colorController = TextEditingController(text: 'White');

  String _category = 'Sedan';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _makeModelController.dispose();
    _plateController.dispose();
    _yearController.dispose();
    _colorController.dispose();
    super.dispose();
  }

  void _handleSubmit() async {
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(milliseconds: 600));

    if (mounted) {
      setState(() => _isSubmitting = false);
      Fluttertoast.showToast(
        msg: 'New vehicle submitted for approval!',
        backgroundColor: AppColors.accentGreenDark,
      );
      if (context.canPop()) {
        context.pop();
      } else {
        context.go(AppRoutes.myVehicleScreen);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.myVehicleScreen);
                          }
                        },
                        icon: Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Add / Replace Vehicle',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Form ──────────────────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      _buildTextField(
                        label: 'Vehicle Make & Model',
                        controller: _makeModelController,
                        icon: Icons.directions_car_outlined,
                        hint: 'e.g. Honda City, Maruti Dzire',
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      Text(
                        'Vehicle Category',
                        style: AppTypography.caption(
                          color: AppColors.textMutedLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 6),

                      Row(
                        children: ['Sedan', 'SUV', 'Hatchback', 'EV'].map((cat) {
                          final isSelected = _category == cat;
                          return Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _category = cat),
                              child: Container(
                                margin: const EdgeInsets.symmetric(horizontal: 4),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? AppColors.primaryLight.withValues(alpha: 0.15)
                                      : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                  border: Border.all(
                                    color: isSelected ? AppColors.primary : AppColors.borderLight,
                                    width: isSelected ? 1.5 : 1,
                                  ),
                                ),
                                child: Text(
                                  cat,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                    color: isSelected ? AppColors.primary : AppColors.textPrimaryLight,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      _buildTextField(
                        label: 'Registration Number (Plate)',
                        controller: _plateController,
                        icon: Icons.badge_outlined,
                        hint: 'e.g. HR 26 AB 1234',
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      Row(
                        children: [
                          Expanded(
                            child: _buildTextField(
                              label: 'Model Year',
                              controller: _yearController,
                              icon: Icons.calendar_today_outlined,
                              keyboardType: TextInputType.number,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: _buildTextField(
                              label: 'Color',
                              controller: _colorController,
                              icon: Icons.palette_outlined,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      Text(
                        'Upload Vehicle Documents',
                        style: AppTypography.h3(
                          color: AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),

                      _buildUploadTile('Vehicle RC Photo (Front & Back)'),
                      const SizedBox(height: AppSpacing.md),
                      _buildUploadTile('Commercial Insurance Certificate'),
                      const SizedBox(height: AppSpacing.xxl),

                      AppPrimaryButton(
                        text: 'SUBMIT VEHICLE FOR APPROVAL',
                        isLoading: _isSubmitting,
                        onPressed: _handleSubmit,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    String? hint,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.caption(
            color: AppColors.textMutedLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          style: AppTypography.body(color: AppColors.textPrimaryLight),
          decoration: InputDecoration(
            prefixIcon: Icon(icon, color: AppColors.primary, size: 20),
            hintText: hint,
            filled: true,
            fillColor: AppColors.surfaceLight,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(color: AppColors.borderLight),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(color: AppColors.borderLight),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(color: AppColors.primary),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildUploadTile(String label) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        children: [
          Icon(Icons.cloud_upload_outlined, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: AppTypography.body(
                color: AppColors.textPrimaryLight,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Text(
            'Upload',
            style: AppTypography.caption(
              color: AppColors.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
