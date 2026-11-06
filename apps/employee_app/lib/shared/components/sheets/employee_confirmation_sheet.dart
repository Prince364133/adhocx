import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';
import '../buttons/employee_danger_button.dart';
import '../buttons/employee_primary_button.dart';
import '../buttons/employee_secondary_button.dart';

/// Confirmation Bottom Sheet for destructive or critical actions:
/// - Sign Out Confirmation
/// - Trip Cancellation Confirmation
/// - Delete Account Confirmation
class EmployeeConfirmationSheet extends StatelessWidget {
  final String title;
  final String description;
  final Widget? illustration;
  final String confirmLabel;
  final VoidCallback onConfirm;
  final String cancelLabel;
  final VoidCallback? onCancel;
  final bool isDestructive;
  final bool isLoading;

  const EmployeeConfirmationSheet({
    super.key,
    required this.title,
    required this.description,
    this.illustration,
    this.confirmLabel = 'Confirm',
    required this.onConfirm,
    this.cancelLabel = 'Cancel',
    this.onCancel,
    this.isDestructive = true,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (illustration != null) ...[
          illustration!,
          const SizedBox(height: 20),
        ],
        Text(
          title,
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          description,
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 14,
            color: AppColors.textSecondary,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 24),
        if (isDestructive)
          EmployeeDangerButton(
            label: confirmLabel,
            isLoading: isLoading,
            onPressed: onConfirm,
          )
        else
          EmployeePrimaryButton(
            label: confirmLabel,
            isLoading: isLoading,
            onPressed: onConfirm,
          ),
        const SizedBox(height: 12),
        EmployeeSecondaryButton(
          label: cancelLabel,
          onPressed: onCancel ?? () => Navigator.of(context).pop(),
          borderColor: Colors.transparent,
          backgroundColor: Colors.transparent,
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

/// Standardized Driver Contact Bottom Sheet with direct call and in-app chat options.
class EmployeeDriverContactSheet extends StatelessWidget {
  final String driverName;
  final double rating;
  final String vehicleNumber;
  final String phone;
  final VoidCallback onCall;
  final VoidCallback onChat;

  const EmployeeDriverContactSheet({
    super.key,
    required this.driverName,
    this.rating = 4.8,
    required this.vehicleNumber,
    required this.phone,
    required this.onCall,
    required this.onChat,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Driver Profile Header
        const CircleAvatar(
          radius: 34,
          backgroundColor: AppColors.primaryBlueLight,
          child: Icon(Icons.person, color: AppColors.primaryBlue, size: 38),
        ),
        const SizedBox(height: 10),
        Text(
          driverName,
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.star_rounded,
                size: 16, color: AppColors.accentAmber),
            const SizedBox(width: 4),
            Text(
              rating.toStringAsFixed(1),
              style:
                  GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.surfaceMuted,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                vehicleNumber,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Action Options
        ListTile(
          onTap: onCall,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.border),
          ),
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: const BoxDecoration(
              color: AppColors.successLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.phone_rounded,
                color: AppColors.success, size: 20),
          ),
          title: Text(
            'Call Driver',
            style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
          ),
          subtitle: Text(
            'Virtual masked call via AdhocX PBX',
            style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted),
          ),
          trailing: const Icon(Icons.chevron_right_rounded,
              color: AppColors.textMuted),
        ),
        const SizedBox(height: 12),
        ListTile(
          onTap: onChat,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.border),
          ),
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: const BoxDecoration(
              color: AppColors.primaryBlueSoft,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.chat_bubble_outline_rounded,
                color: AppColors.primaryBlue, size: 20),
          ),
          title: Text(
            'In-App Chat',
            style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
          ),
          subtitle: Text(
            'Quick messages & canned responses',
            style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted),
          ),
          trailing: const Icon(Icons.chevron_right_rounded,
              color: AppColors.textMuted),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}
