import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen: Enter Indian Mobile Number (+91) for Corporate Commuter Authentication.
/// Email and Google auth completely removed as per SMS phone authentication mandate.
///
/// Number entry uses the phone's native number keyboard (no in-app dialer):
/// the field autofocuses, supports phone-number autofill, and submits from the
/// keyboard's "Done" key. The CTA is pinned below the scroll area so it stays
/// visible directly above the keyboard.
class MobileNumberScreen extends StatefulWidget {
  const MobileNumberScreen({super.key});

  @override
  State<MobileNumberScreen> createState() => _MobileNumberScreenState();
}

class _MobileNumberScreenState extends State<MobileNumberScreen> {
  final TextEditingController _inputController = TextEditingController();
  final FocusNode _inputFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    _inputController.addListener(_rebuild);
    _inputFocus.addListener(_rebuild);
  }

  void _rebuild() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _inputController.dispose();
    _inputFocus.dispose();
    super.dispose();
  }

  bool _isValidIndianMobile(String digits) =>
      RegExp(r'^[6-9]\d{9}$').hasMatch(digits);

  Future<void> _handleSendOtp() async {
    final authProvider = context.read<EmployeeAuthProvider>();
    if (authProvider.isLoading) return;
    final digits = _inputController.text;

    if (!_isValidIndianMobile(digits)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).'),
          backgroundColor: AppColors.error,
        ),
      );
      _inputFocus.requestFocus();
      return;
    }

    final success = await authProvider.sendOtp('+91 $digits');
    if (mounted && success) {
      context.push(AppRoutes.otpVerify);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final authProvider = context.watch<EmployeeAuthProvider>();
    final isReady = _inputController.text.length == 10;

    return Scaffold(
      backgroundColor: p.background,
      // Body shrinks when the keyboard opens, keeping the CTA above it.
      resizeToAvoidBottomInset: true,
      appBar: EmployeeAppBar(
        onBack: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(AppRoutes.welcome);
          }
        },
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xxl,
                  vertical: AppSpacing.sm,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Enter Mobile Number',
                      style: AppTypography.h2(color: p.textPrimary),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      "We'll send a 6-digit SMS OTP to verify your Indian mobile number via MSG91.",
                      style: AppTypography.body(color: p.textSecondary),
                    ),
                    const SizedBox(height: AppSpacing.xxl),
                    _buildPhoneField(p),
                    if (authProvider.errorMessage != null) ...[
                      const SizedBox(height: AppSpacing.md),
                      Row(
                        children: [
                          const Icon(Icons.error_outline,
                              size: 16, color: AppColors.errorText),
                          const SizedBox(width: AppSpacing.xs + 2),
                          Expanded(
                            child: Text(
                              authProvider.errorMessage!,
                              style:
                                  AppTypography.small(color: AppColors.errorText),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Pinned CTA — sits directly above the native keyboard.
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.xxl,
                AppSpacing.sm,
                AppSpacing.xxl,
                AppSpacing.lg,
              ),
              child: EmployeePrimaryButton(
                label: 'Send SMS OTP',
                isLoading: authProvider.isLoading,
                onPressed: isReady ? _handleSendOtp : null,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Visually identical to the Driver app's AppPhoneField (caption label,
  /// phone icon + "+91" prefix with divider, surface fill, 8px radius, 1.2px
  /// border, 1.8px brand focus border) — but with the native-keyboard
  /// behaviour this screen needs: autofocus, phone autofill, "Done" submits,
  /// and +91/0 normalisation of pasted or autofilled numbers.
  Widget _buildPhoneField(EmployeePalette p) {
    final hasText = _inputController.text.isNotEmpty;

    OutlineInputBorder border(Color color, double width) => OutlineInputBorder(
          borderRadius: AppRadius.borderMd,
          borderSide: BorderSide(color: color, width: width),
        );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'Mobile Number',
          style: AppTypography.caption(
            color: p.textSecondary,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        TextField(
          controller: _inputController,
          focusNode: _inputFocus,
          autofocus: true,
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.done,
          autofillHints: const [
            AutofillHints.telephoneNumberNational,
            AutofillHints.telephoneNumber,
          ],
          inputFormatters: [IndianMobileNumberFormatter()],
          enableSuggestions: false,
          autocorrect: false,
          onSubmitted: (_) {
            if (_inputController.text.length == 10) _handleSendOtp();
          },
          cursorColor: p.accent,
          style: AppTypography.body(color: p.textPrimary)
              .copyWith(letterSpacing: 0.6),
          decoration: InputDecoration(
            hintText: '98765 43210',
            hintStyle: AppTypography.body(color: p.textMuted),
            prefixIcon: Container(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              margin: const EdgeInsets.only(right: AppSpacing.sm),
              decoration: BoxDecoration(
                border: Border(
                  right: BorderSide(color: p.border, width: 1.2),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.phone_iphone_rounded,
                    size: 18,
                    color: p.textSecondary,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    '+91',
                    style: AppTypography.body(
                      color: p.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            suffixIcon: hasText
                ? IconButton(
                    tooltip: 'Clear number',
                    onPressed: () {
                      _inputController.clear();
                      _inputFocus.requestFocus();
                    },
                    icon: Icon(Icons.cancel, size: 18, color: p.textMuted),
                  )
                : null,
            filled: true,
            fillColor: p.isDark ? AppColors.surfaceElevatedDark : p.surface,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.md,
            ),
            enabledBorder: border(p.border, 1.2),
            focusedBorder: border(p.accent, 1.8),
            errorBorder: border(AppColors.error, 1.2),
            focusedErrorBorder: border(AppColors.error, 1.8),
          ),
        ),
      ],
    );
  }
}

/// Keeps the field holding at most the 10 national digits of an Indian mobile.
///
/// Normalises what the native keyboard, paste, or phone-number autofill can
/// produce — e.g. `+91 98765 43210`, `09876543210`, `98765-43210` — down to
/// `9876543210`, and rejects edits that would exceed 10 digits.
class IndianMobileNumberFormatter extends TextInputFormatter {
  static String normalize(String raw) {
    var digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
    // Full international form (+91 / 0091 / 91 + 10 digits) from paste/autofill.
    if (digits.startsWith('0091') && digits.length == 14) {
      digits = digits.substring(4);
    } else if (digits.startsWith('91') && digits.length == 12) {
      digits = digits.substring(2);
    }
    // Indian mobiles never start with 0 (trunk prefix) — drop it.
    digits = digits.replaceFirst(RegExp(r'^0+'), '');
    return digits;
  }

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = normalize(newValue.text);
    if (digits.length > 10) return oldValue;
    // Plain digit typing/deleting: keep the caret where the user put it.
    if (digits == newValue.text) return newValue;
    return TextEditingValue(
      text: digits,
      selection: TextSelection.collapsed(offset: digits.length),
    );
  }
}
