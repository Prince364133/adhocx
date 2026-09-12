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
    return Container(
      padding: const EdgeInsets.all(20),
      // 1. MATCHING CONTAINER: Transparent background with subtle white border
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeader('3', 'Vehicle Details'),
          const SizedBox(height: 24),
          
          // Vehicle type toggle
          const Text(
            'Vehicle Category',
            style: TextStyle(
              color: AppColors.slate400, // Matching grey label
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _typeButton('sedan', '🚗 Sedan'),
              const SizedBox(width: 12),
              _typeButton('suv', '🚙 SUV'),
            ],
          ),
          const SizedBox(height: 24),
          
          _field(
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

  Widget _typeButton(String type, String label) {
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
          // 2. MATCHING TOGGLE BUTTONS: Green highlight when selected, dark grey when not
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.successContainer
                : AppColors.surfaceElevatedDark, // Dark grey input background
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected
                  ? AppColors.success
                  : Colors.white10,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected
                  ? AppColors.success
                  : AppColors.slate400,
              fontSize: 14,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  Widget _field({
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
          style: const TextStyle(
            color: AppColors.slate400, // Soft grey for labels
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        // 3. MATCHING INPUT: Dark grey fill, white outline border
        TextFormField(
          textCapitalization: textCapitalization,
          style: const TextStyle(color: Colors.white, fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.2)),
            prefixIcon: Icon(
              icon, 
              color: Colors.white.withValues(alpha: 0.5), 
              size: 20,
            ),
            filled: true,
            fillColor: AppColors.surfaceElevatedDark, // Dark grey input background
            contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Colors.white10),
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
        // 4. MATCHING HEADER: Faded green box, bright green text
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