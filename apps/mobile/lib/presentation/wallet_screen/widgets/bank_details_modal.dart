import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../../services/auth_service.dart';
import '../../../services/driver_service.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_typography.dart';
import '../../../widgets/common/app_primary_button.dart';
import '../../../core/utils/app_toast.dart';

/// Interactive modal allowing drivers to view and update their bank payout details.
class BankDetailsModal extends StatefulWidget {
  final Map<String, dynamic>? initialDetails;
  final ValueChanged<Map<String, dynamic>>? onSaved;

  const BankDetailsModal({
    super.key,
    this.initialDetails,
    this.onSaved,
  });

  /// Helper to show this bottom sheet modal conveniently from anywhere.
  static Future<Map<String, dynamic>?> show(
    BuildContext context, {
    Map<String, dynamic>? initialDetails,
    ValueChanged<Map<String, dynamic>>? onSaved,
  }) {
    return showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BankDetailsModal(
        initialDetails: initialDetails,
        onSaved: onSaved,
      ),
    );
  }

  @override
  State<BankDetailsModal> createState() => _BankDetailsModalState();
}

class _BankDetailsModalState extends State<BankDetailsModal> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _holderNameCtrl;
  late TextEditingController _bankNameCtrl;
  late TextEditingController _accountNumberCtrl;
  late TextEditingController _confirmAccountCtrl;
  late TextEditingController _ifscCtrl;
  late TextEditingController _upiCtrl;

  bool _isSaving = false;
  bool _obscureAccount = false;

  final List<String> _popularBanks = const [
    'HDFC Bank',
    'State Bank of India',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra',
    'Punjab National Bank',
  ];

  @override
  void initState() {
    super.initState();
    final d = widget.initialDetails ?? {};

    final currentUserName = AuthService.instance.currentUser?.fullName ?? '';
    final defaultHolder = (d['bankAccountName'] ??
            d['bank_account_name'] ??
            d['account_holder'] ??
            d['fullName'] ??
            d['full_name'] ??
            currentUserName)
        .toString()
        .trim();

    _holderNameCtrl = TextEditingController(text: defaultHolder);
    _bankNameCtrl = TextEditingController(
      text: (d['bankName'] ?? d['bank_name'] ?? '').toString().trim(),
    );
    final initialAcc = (d['bankAccountNumber'] ??
            d['bank_account_number'] ??
            d['account_number'] ??
            '')
        .toString()
        .trim();
    _accountNumberCtrl = TextEditingController(text: initialAcc);
    _confirmAccountCtrl = TextEditingController(text: initialAcc);
    _ifscCtrl = TextEditingController(
      text: (d['bankIfsc'] ?? d['bank_ifsc'] ?? d['ifsc'] ?? '')
          .toString()
          .trim()
          .toUpperCase(),
    );
    _upiCtrl = TextEditingController(
      text: (d['upiId'] ?? d['upi_id'] ?? '').toString().trim(),
    );
  }

  @override
  void dispose() {
    _holderNameCtrl.dispose();
    _bankNameCtrl.dispose();
    _accountNumberCtrl.dispose();
    _confirmAccountCtrl.dispose();
    _ifscCtrl.dispose();
    _upiCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    final holder = _holderNameCtrl.text.trim();
    final bank = _bankNameCtrl.text.trim();
    final acc = _accountNumberCtrl.text.trim();
    final ifsc = _ifscCtrl.text.trim().toUpperCase();
    final upi = _upiCtrl.text.trim();

    setState(() => _isSaving = true);

    try {
      await DriverService.instance.updateBankDetails(
        bankAccountName: holder,
        bankAccountNumber: acc,
        bankIfsc: ifsc,
        bankName: bank.isNotEmpty ? bank : null,
        upiId: upi.isNotEmpty ? upi : null,
      );

      final updatedMap = <String, dynamic>{
        'bankAccountName': holder,
        'bankAccountNumber': acc,
        'bankIfsc': ifsc,
        'bankName': bank,
        'upiId': upi,
        // Legacy keys for cross-compatibility
        'account_holder': holder,
        'account_number': acc,
        'ifsc': ifsc,
        'bank_name': bank,
        'upi_id': upi,
      };

      widget.onSaved?.call(updatedMap);

      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Bank account updated successfully!',
          backgroundColor: AppColors.accentGreenDark,
        );
        Navigator.of(context).pop(updatedMap);
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return AnimatedPadding(
      padding: EdgeInsets.only(bottom: bottomInset),
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.9,
          maxWidth: 480,
        ),
        margin: const EdgeInsets.symmetric(horizontal: 8),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Drag Handle ──────────────────────────────────────────────────
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // ── Modal Header ─────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppColors.primary.withValues(alpha: 0.2)
                          : AppColors.primaryLight.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: Icon(
                      Icons.account_balance_rounded,
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Bank & Payout Information',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Earnings will be paid directly into this account',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(
                      Icons.close_rounded,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                ],
              ),
            ),
            Divider(
              height: 1,
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
            ),

            // ── Form Content (Scrollable) ────────────────────────────────────
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Account Holder Name
                      _buildFieldLabel('Account Holder Legal Name', isDark, isRequired: true),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _holderNameCtrl,
                        textCapitalization: TextCapitalization.words,
                        style: _fieldTextStyle(isDark),
                        decoration: _fieldDecoration(
                          isDark,
                          hint: 'Full legal name on bank account',
                          icon: Icons.person_outline_rounded,
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Account holder name is required';
                          }
                          if (val.trim().length < 3) {
                            return 'Please enter full legal name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // 2. Bank Name & Suggestions
                      _buildFieldLabel('Bank Name', isDark, isRequired: true),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _bankNameCtrl,
                        textCapitalization: TextCapitalization.words,
                        style: _fieldTextStyle(isDark),
                        decoration: _fieldDecoration(
                          isDark,
                          hint: 'e.g. HDFC Bank, SBI, ICICI Bank',
                          icon: Icons.account_balance_outlined,
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Bank name is required';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 8),

                      // Quick Bank Chips
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: _popularBanks.map((b) {
                          final isSelected = _bankNameCtrl.text.trim().toLowerCase() == b.toLowerCase();
                          return InkWell(
                            onTap: () {
                              setState(() {
                                _bankNameCtrl.text = b;
                              });
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? (isDark ? AppColors.primary.withValues(alpha: 0.3) : AppColors.primaryLight.withValues(alpha: 0.2))
                                    : (isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isSelected
                                      ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                      : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                ),
                              ),
                              child: Text(
                                b,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                  color: isSelected
                                      ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                      : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 16),

                      // 3. Bank Account Number
                      _buildFieldLabel('Bank Account Number', isDark, isRequired: true),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _accountNumberCtrl,
                        keyboardType: TextInputType.number,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        obscureText: _obscureAccount,
                        style: _fieldTextStyle(isDark).copyWith(letterSpacing: 1.2),
                        decoration: _fieldDecoration(
                          isDark,
                          hint: 'Enter 9 to 18 digit account number',
                          icon: Icons.credit_card_rounded,
                          suffix: IconButton(
                            icon: Icon(
                              _obscureAccount ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                              size: 18,
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                            onPressed: () => setState(() => _obscureAccount = !_obscureAccount),
                          ),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Account number is required';
                          }
                          if (val.trim().length < 8 || val.trim().length > 18) {
                            return 'Valid bank account must be 8-18 digits';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // 4. Confirm Bank Account Number
                      _buildFieldLabel('Confirm Bank Account Number', isDark, isRequired: true),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _confirmAccountCtrl,
                        keyboardType: TextInputType.number,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        style: _fieldTextStyle(isDark).copyWith(letterSpacing: 1.2),
                        decoration: _fieldDecoration(
                          isDark,
                          hint: 'Re-enter account number to verify',
                          icon: Icons.check_circle_outline_rounded,
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Please confirm account number';
                          }
                          if (val.trim() != _accountNumberCtrl.text.trim()) {
                            return 'Account numbers do not match';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // 5. IFSC Code
                      _buildFieldLabel('IFSC Code', isDark, isRequired: true),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _ifscCtrl,
                        textCapitalization: TextCapitalization.characters,
                        inputFormatters: [
                          LengthLimitingTextInputFormatter(11),
                          FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9]')),
                        ],
                        style: _fieldTextStyle(isDark).copyWith(letterSpacing: 1.5, fontWeight: FontWeight.bold),
                        decoration: _fieldDecoration(
                          isDark,
                          hint: '11-character code (e.g. HDFC0001234)',
                          icon: Icons.domain_rounded,
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'IFSC code is required';
                          }
                          final v = val.trim().toUpperCase();
                          if (v.length != 11) {
                            return 'IFSC code must be exactly 11 characters';
                          }
                          final ifscPattern = RegExp(r'^[A-Z]{4}0[A-Z0-9]{6}$');
                          if (!ifscPattern.hasMatch(v)) {
                            return 'Invalid IFSC format (e.g. HDFC0001234, SBIN0001234)';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // 6. Optional UPI ID
                      _buildFieldLabel('UPI ID (Optional)', isDark, isRequired: false),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _upiCtrl,
                        keyboardType: TextInputType.emailAddress,
                        style: _fieldTextStyle(isDark),
                        decoration: _fieldDecoration(
                          isDark,
                          hint: 'e.g. 7893545818@upi or name@okhdfcbank',
                          icon: Icons.qr_code_2_rounded,
                        ),
                        validator: (val) {
                          if (val != null && val.trim().isNotEmpty) {
                            if (!val.contains('@')) {
                              return 'Enter valid UPI ID containing @';
                            }
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),

                      // Security / Compliance badge
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.verified_user_rounded,
                              size: 18,
                              color: AppColors.accentGreenDark,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Bank payout credentials are AES-256 encrypted and validated for automated RTGS/NEFT/IMPS settlements. Payouts are directly credited to this account.',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // ── Action Buttons ──────────────────────────────────────
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => Navigator.of(context).pop(),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                side: BorderSide(
                                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                ),
                              ),
                              child: Text(
                                'Cancel',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: AppPrimaryButton(
                              text: 'SAVE BANK DETAILS',
                              isLoading: _isSaving,
                              onPressed: _handleSave,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String label, bool isDark, {required bool isRequired}) {
    return Row(
      children: [
        Text(
          label,
          style: AppTypography.caption(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        if (isRequired)
          const Text(
            ' *',
            style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold),
          ),
      ],
    );
  }

  TextStyle _fieldTextStyle(bool isDark) {
    return TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w500,
      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
    );
  }

  InputDecoration _fieldDecoration(
    bool isDark, {
    required String hint,
    required IconData icon,
    Widget? suffix,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(
        fontSize: 13,
        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
      ),
      prefixIcon: Icon(
        icon,
        size: 18,
        color: isDark ? AppColors.primaryLight : AppColors.primary,
      ),
      suffixIcon: suffix,
      filled: true,
      fillColor: isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: BorderSide(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: BorderSide(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: BorderSide(
          color: isDark ? AppColors.primaryLight : AppColors.primary,
          width: 1.5,
        ),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: Colors.redAccent, width: 1.2),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
      ),
    );
  }
}
