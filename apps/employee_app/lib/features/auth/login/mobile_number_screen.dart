import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/employee_app_bar.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

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
    final authProvider = context.watch<EmployeeAuthProvider>();
    final digits = _inputController.text;
    final isReady = digits.length == 10;

    return Scaffold(
      backgroundColor: AppColors.surface,
      // Default, stated explicitly: the body shrinks when the keyboard opens,
      // which keeps the pinned CTA right above the keyboard.
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
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Enter Mobile Number',
                      style: GoogleFonts.inter(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "We'll send a 6-digit SMS OTP to verify your Indian mobile number via MSG91.",
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 24),
                    _buildPhoneField(digits),
                    if (authProvider.errorMessage != null) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(Icons.error_outline,
                              size: 16, color: AppColors.error),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              authProvider.errorMessage!,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: AppColors.error,
                                fontWeight: FontWeight.w500,
                              ),
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
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
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

  /// Phone Input Field (+91 India) using the phone's native number keyboard.
  Widget _buildPhoneField(String digits) {
    final hasText = digits.isNotEmpty;

    return Container(
      padding: const EdgeInsets.only(left: 14, right: 4, top: 2, bottom: 2),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: hasText || _inputFocus.hasFocus
              ? AppColors.primaryBlue
              : AppColors.border,
          width: hasText ? 2.0 : 1.5,
        ),
      ),
      child: Row(
        children: [
          ExcludeSemantics(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('🇮🇳', style: TextStyle(fontSize: 16)),
                const SizedBox(width: 5),
                Text(
                  '+91',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          Container(
            height: 24,
            width: 1,
            color: AppColors.border,
            margin: const EdgeInsets.symmetric(horizontal: 10),
          ),
          Expanded(
            child: TextField(
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
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
                letterSpacing: 0.6,
              ),
              decoration: InputDecoration(
                hintText: '98765 43210',
                hintStyle: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textMuted,
                  letterSpacing: 0,
                ),
                semanticCounterText: '',
                filled: false,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                disabledBorder: InputBorder.none,
                errorBorder: InputBorder.none,
                focusedErrorBorder: InputBorder.none,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          if (hasText)
            IconButton(
              tooltip: 'Clear number',
              onPressed: () {
                _inputController.clear();
                _inputFocus.requestFocus();
              },
              icon: const Icon(
                Icons.cancel,
                size: 18,
                color: AppColors.textMuted,
              ),
            ),
        ],
      ),
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
