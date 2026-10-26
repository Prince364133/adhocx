import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../services/driver_service.dart';

/// Bottom Sheet modal for verifying passenger 4-digit Start Trip OTP.
/// Replaces legacy pop-up dialogs with a modern, responsive bottom sheet adhering to AdhocX design system.
class TripStartOtpBottomSheet extends StatefulWidget {
  final String tripId;
  final String? passengerName;

  const TripStartOtpBottomSheet({
    super.key,
    required this.tripId,
    this.passengerName,
  });

  /// Displays the 4-digit Start Trip OTP modal bottom sheet.
  /// Returns `true` if trip was successfully verified and started.
  static Future<bool?> show({
    required BuildContext context,
    required String tripId,
    String? passengerName,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => TripStartOtpBottomSheet(
        tripId: tripId,
        passengerName: passengerName,
      ),
    );
  }

  @override
  State<TripStartOtpBottomSheet> createState() => _TripStartOtpBottomSheetState();
}

class _TripStartOtpBottomSheetState extends State<TripStartOtpBottomSheet> {
  final TextEditingController _otpController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Auto-focus the OTP input upon sheet opening
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _focusNode.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    _otpController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _submitOtp() async {
    final otp = _otpController.text.trim();
    if (otp.length != 4) {
      setState(() {
        _errorMessage = 'Please enter a complete 4-digit OTP';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      await DriverService.instance.startTrip(widget.tripId, otp);
      DriverService.instance.notifyTripChanged(tripId: widget.tripId, status: 'IN_PROGRESS');
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = 'Incorrect OTP ($otp). Ask the passenger for the 4-digit PIN on their AdhocX screen.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final currentOtp = _otpController.text;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.12),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.only(
        left: AppSpacing.xl,
        right: AppSpacing.xl,
        top: AppSpacing.md,
        bottom: AppSpacing.xl + bottomInset,
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Grabber Handle
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight,
                    borderRadius: AppRadius.borderPill,
                  ),
                ),
              ),

              // Header Row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.pin_outlined,
                      color: AppColors.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Start Trip - Enter OTP',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.passengerName != null && widget.passengerName!.isNotEmpty
                              ? 'Ask ${widget.passengerName} for their 4-digit trip start PIN'
                              : 'Ask passenger for the 4-digit Ride Start PIN displayed on their booking screen',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    icon: Icon(
                      Icons.close_rounded,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.lg),

              // 4-Digit Visual PIN Boxes
              GestureDetector(
                onTap: () => _focusNode.requestFocus(),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(4, (index) {
                    final hasChar = index < currentOtp.length;
                    final char = hasChar ? currentOtp[index] : '';
                    final isFocused = _focusNode.hasFocus && (index == currentOtp.length || (index == 3 && currentOtp.length == 4));

                    return Container(
                      width: 58,
                      height: 64,
                      margin: const EdgeInsets.symmetric(horizontal: 6),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceElevatedDark : AppColors.slate50,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(
                          color: _errorMessage != null
                              ? AppColors.error
                              : isFocused
                                  ? AppColors.primary
                                  : (hasChar
                                      ? (isDark ? AppColors.borderDark : AppColors.borderLight)
                                      : (isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight)),
                          width: isFocused || _errorMessage != null ? 2.0 : 1.2,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        char,
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          letterSpacing: 1.5,
                        ),
                      ),
                    );
                  }),
                ),
              ),

              // Hidden TextField controlling the 4-digit input
              Opacity(
                opacity: 0.0,
                child: SizedBox(
                  height: 1,
                  child: TextField(
                    controller: _otpController,
                    focusNode: _focusNode,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(4),
                    ],
                    onChanged: (val) {
                      setState(() {
                        _errorMessage = null;
                      });
                      if (val.length == 4) {
                        _submitOtp();
                      }
                    },
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.sm),

              // Error banner if any
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, size: 16, color: AppColors.error),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(
                            color: AppColors.error,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
              ] else
                const SizedBox(height: AppSpacing.sm),

              // Action Buttons
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: _isSubmitting || currentOtp.length != 4
                      ? null
                      : _submitOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accentGreenDark,
                    disabledBackgroundColor: isDark
                        ? AppColors.surfaceElevatedDark
                        : AppColors.slate200,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2.2,
                          ),
                        )
                      : const Text(
                          'VERIFY & START TRIP →',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            letterSpacing: 0.5,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: AppSpacing.sm),

              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: Text(
                  'Cancel',
                  style: TextStyle(
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
