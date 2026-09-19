import 'package:adhocx/shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

class KycVehicleSectionWidget extends StatefulWidget {
  final String initialVehicleType;
  final ValueChanged<String> onVehicleTypeChanged;
  final ValueChanged<Map<String, String>> onSaved;

  const KycVehicleSectionWidget({
    super.key,
    required this.initialVehicleType,
    required this.onVehicleTypeChanged,
    required this.onSaved,
  });

  @override
  State<KycVehicleSectionWidget> createState() =>
      _KycVehicleSectionWidgetState();
}

class _KycVehicleSectionWidgetState extends State<KycVehicleSectionWidget> {
  late String _vehicleType;

  @override
  void initState() {
    super.initState();
    _vehicleType = widget.initialVehicleType;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white12 : AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeader('3', 'Vehicle Details'),
          const SizedBox(height: 24),
          
          // Vehicle type toggle
          Text(
            'Vehicle Category',
            style: TextStyle(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _typeButton(isDark, 'sedan', '🚗 Sedan'),
              const SizedBox(width: 12),
              _typeButton(isDark, 'suv', '🚙 SUV'),
            ],
          ),
          const SizedBox(height: 24),
          
          _field(
            isDark: isDark,
            label: 'Vehicle Number',
            hint: 'TS09EF1234',
            icon: Icons.directions_car_outlined,
            textCapitalization: TextCapitalization.characters,
            onSaved: (v) =>
                widget.onSaved({'vehicle_number': v?.toUpperCase() ?? ''}),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Required' : null,
          ),
          const SizedBox(height: 16),
          _field(
            isDark: isDark,
            label: 'Vehicle RC Number',
            hint: 'TS09EF1234RC',
            icon: Icons.article_outlined,
            textCapitalization: TextCapitalization.characters,
            onSaved: (v) =>
                widget.onSaved({'rc_number': v?.toUpperCase() ?? ''}),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Required' : null,
          ),
        ],
      ),
    );
  }

  Widget _typeButton(bool isDark, String type, String label) {
    final isSelected = _vehicleType == type;

    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() => _vehicleType = type);
          widget.onVehicleTypeChanged(type);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.successContainer
                : (isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected
                  ? AppColors.success
                  : (isDark ? AppColors.borderDark : AppColors.borderLight),
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected
                  ? AppColors.success
                  : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
              fontSize: 14,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  Widget _field({
    required bool isDark,
    required String label,
    required String hint,
    required IconData icon,
    TextCapitalization textCapitalization = TextCapitalization.none,
    FormFieldSetter<String>? onSaved,
    FormFieldValidator<String>? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          textCapitalization: textCapitalization,
          style: TextStyle(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontSize: 14,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
            prefixIcon: Icon(
              icon, 
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, 
              size: 20,
            ),
            filled: true,
            fillColor: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
            contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.success),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.error),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.error),
            ),
          ),
          onSaved: onSaved,
          validator: validator,
        ),
      ],
    );
  }

  Widget _sectionHeader(String num, String title) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: AppColors.successContainer,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Center(
            child: Text(
              num,
              style: const TextStyle(
                color: AppColors.success,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Text(
          title,
          style: const TextStyle(
            color: AppColors.success,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}