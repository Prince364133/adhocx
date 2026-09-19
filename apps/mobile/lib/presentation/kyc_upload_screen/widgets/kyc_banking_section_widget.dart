import 'package:adhocx/shared/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class KycBankingSectionWidget extends StatefulWidget {
  final ValueChanged<Map<String, String>> onSaved;

  const KycBankingSectionWidget({super.key, required this.onSaved});

  @override
  State<KycBankingSectionWidget> createState() => _KycBankingSectionWidgetState();
}

class _KycBankingSectionWidgetState extends State<KycBankingSectionWidget> {
  String? _selectedBank;

  final List<String> _indianBanks = [
    'State Bank of India (SBI)',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Punjab National Bank (PNB)',
    'Bank of Baroda (BOB)',
    'Canara Bank',
    'Union Bank of India',
    'Bank of India',
    'IndusInd Bank',
    'IDBI Bank',
    'Federal Bank',
    'Yes Bank',
    'Standard Chartered Bank',
    'HSBC',
    'RBL Bank',
    'Bandhan Bank',
    'South Indian Bank',
    'Indian Bank',
    'Central Bank of India',
    'UCO Bank',
    'IDFC First Bank',
    'Airtel Payments Bank',
    'Paytm Payments Bank',
    'India Post Payments Bank',
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return _KycSection(
      isDark: isDark,
      title: 'Banking Details',
      sectionNumber: '4',
      child: Column(
        children: [
          _KycField(
            isDark: isDark,
            label: 'Account Holder Name',
            hint: 'Name as per bank records',
            icon: Icons.account_balance_wallet_outlined,
            onSaved: (v) => widget.onSaved({'account_holder_name': v ?? ''}),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
          ),
          const SizedBox(height: 14),
          // Searchable Bank Dropdown Selection
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Bank Name',
                style: TextStyle(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedBank,
                dropdownColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                style: TextStyle(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontSize: 14,
                ),
                decoration: InputDecoration(
                  hintText: 'Select or search your bank',
                  hintStyle: TextStyle(
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                  prefixIcon: Icon(
                    Icons.account_balance_outlined,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    size: 18,
                  ),
                  filled: true,
                  fillColor: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(
                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.success),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.error),
                  ),
                  focusedErrorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.error),
                  ),
                ),
                isExpanded: true,
                items: _indianBanks.map((String bank) {
                  return DropdownMenuItem<String>(
                    value: bank,
                    child: Text(
                      bank,
                      style: TextStyle(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      ),
                    ),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  setState(() {
                    _selectedBank = newValue;
                  });
                },
                onSaved: (v) => widget.onSaved({'bank_name': v ?? ''}),
                validator: (v) => (v == null || v.isEmpty) ? 'Please select a bank' : null,
              ),
            ],
          ),
          const SizedBox(height: 14),
          _KycField(
            isDark: isDark,
            label: 'Account Number',
            hint: 'Enter account number',
            icon: Icons.numbers_outlined,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
            ],
            onSaved: (v) => widget.onSaved({'account_number': v ?? ''}),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
          ),
          const SizedBox(height: 14),
          _KycField(
            isDark: isDark,
            label: 'IFSC Code',
            hint: 'e.g., HDFC0001234',
            icon: Icons.pin_drop_outlined,
            textCapitalization: TextCapitalization.characters,
            inputFormatters: [
              UpperCaseTextFormatter(),
              FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9]')),
              LengthLimitingTextInputFormatter(11),
            ],
            onSaved: (v) => widget.onSaved({'ifsc': v?.toUpperCase() ?? ''}),
            validator: (v) {
              if (v == null || v.isEmpty) return 'Required';
              if (v.length != 11) return 'IFSC must be 11 characters';
              return null;
            },
          ),
        ],
      ),
    );
  }
}

class _KycSection extends StatelessWidget {
  final bool isDark;
  final String title;
  final String sectionNumber;
  final Widget child;

  const _KycSection({
    required this.isDark,
    required this.title,
    required this.sectionNumber,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: AppColors.success,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Center(
                  child: Text(
                    sectionNumber,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.success,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _KycField extends StatelessWidget {
  final bool isDark;
  final String label;
  final String hint;
  final IconData icon;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final List<TextInputFormatter>? inputFormatters;
  final FormFieldSetter<String>? onSaved;
  final FormFieldValidator<String>? validator;

  const _KycField({
    required this.isDark,
    required this.label,
    required this.hint,
    required this.icon,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.none,
    this.inputFormatters,
    this.onSaved,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
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
        const SizedBox(height: 6),
        TextFormField(
          keyboardType: keyboardType,
          textCapitalization: textCapitalization,
          inputFormatters: inputFormatters,
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
              size: 18,
            ),
            filled: true,
            fillColor: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.success),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.error),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.error),
            ),
          ),
          onSaved: onSaved,
          validator: validator,
        ),
      ],
    );
  }
}

class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    return TextEditingValue(
      text: newValue.text.toUpperCase(),
      selection: newValue.selection,
    );
  }
}