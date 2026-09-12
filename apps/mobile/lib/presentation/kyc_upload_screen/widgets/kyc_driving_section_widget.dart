import 'package:adhocx/shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

class KycDrivingSectionWidget extends StatelessWidget {
  final ValueChanged<Map<String, String>> onSaved;

  const KycDrivingSectionWidget({super.key, required this.onSaved});

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
          _sectionHeader('2', 'Driving Credentials'),
          const SizedBox(height: 24),
          _label('Driver License Number'),
          const SizedBox(height: 8),
          // 2. MATCHING INPUT: Dark grey fill, white outline border
          TextFormField(
            textCapitalization: TextCapitalization.characters,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'TS09 20220012345',
              hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.2)),
              prefixIcon: Icon(
                Icons.drive_eta_outlined,
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
            onSaved: (v) => onSaved({'dl_number': v?.toUpperCase() ?? ''}),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Required' : null,
          ),
        ],
      ),
    );
  }

  Widget _label(String text) => Text(
    text,
    style: const TextStyle(
      color: AppColors.slate400, // Soft grey for labels
      fontSize: 13,
      fontWeight: FontWeight.w500,
    ),
  );

  Widget _sectionHeader(String num, String title) {
    return Row(
      children: [
        // 3. MATCHING HEADER: Faded green box, bright green text
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