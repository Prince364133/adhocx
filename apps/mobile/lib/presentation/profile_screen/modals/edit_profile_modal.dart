import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class EditProfileModal extends StatefulWidget {
  final Map<String, dynamic> profile;

  const EditProfileModal({super.key, required this.profile});

  @override
  State<EditProfileModal> createState() => _EditProfileModalState();
}

class _EditProfileModalState extends State<EditProfileModal> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _dlCtrl;
  late TextEditingController _panCtrl;
  late TextEditingController _aadhaarCtrl;
  late TextEditingController _vehicleNumCtrl;
  late TextEditingController _rcCtrl;
  late TextEditingController _bankNameCtrl;
  late TextEditingController _accountCtrl;
  late TextEditingController _ifscCtrl;
  late TextEditingController _upiCtrl;
  late String _vehicleType;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(
      text: widget.profile['full_name'] as String? ?? widget.profile['name'] as String? ?? '',
    );
    _phoneCtrl = TextEditingController(
      text: widget.profile['phone'] as String? ?? '',
    );
    _dlCtrl = TextEditingController(
      text: widget.profile['dl_number'] as String? ?? '',
    );
    _panCtrl = TextEditingController(
      text: widget.profile['pan_number'] as String? ?? widget.profile['pan'] as String? ?? '',
    );
    _aadhaarCtrl = TextEditingController(
      text: widget.profile['aadhaar_number'] as String? ?? widget.profile['aadhaar'] as String? ?? '',
    );
    _vehicleNumCtrl = TextEditingController(
      text: widget.profile['vehicle_number'] as String? ?? '',
    );
    _rcCtrl = TextEditingController(
      text: widget.profile['rc_number'] as String? ?? '',
    );
    _bankNameCtrl = TextEditingController(
      text: widget.profile['bank_name'] as String? ?? '',
    );
    _accountCtrl = TextEditingController(
      text: widget.profile['bank_account_number'] as String? ?? widget.profile['account_number'] as String? ?? '',
    );
    _ifscCtrl = TextEditingController(
      text: widget.profile['bank_ifsc'] as String? ?? widget.profile['ifsc'] as String? ?? '',
    );
    _upiCtrl = TextEditingController(
      text: widget.profile['upi_id'] as String? ?? '',
    );
    _vehicleType = widget.profile['vehicle_type'] as String? ?? 'sedan';
  }

  @override
  void dispose() {
    for (final c in [
      _nameCtrl,
      _phoneCtrl,
      _dlCtrl,
      _panCtrl,
      _aadhaarCtrl,
      _vehicleNumCtrl,
      _rcCtrl,
      _bankNameCtrl,
      _accountCtrl,
      _ifscCtrl,
      _upiCtrl,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    try {
      final supabase = Supabase.instance.client;
      final currentUser = supabase.auth.currentUser;

      if (currentUser != null) {
        await supabase.from('driver_profiles').update({
          'full_name': _nameCtrl.text.trim(),
          'phone': _phoneCtrl.text.trim(),
          'dl_number': _dlCtrl.text.trim(),
          'pan_number': _panCtrl.text.trim(),
          'aadhaar_number': _aadhaarCtrl.text.trim(),
          'vehicle_number': _vehicleNumCtrl.text.trim(),
          'rc_number': _rcCtrl.text.trim(),
          'bank_name': _bankNameCtrl.text.trim(),
          'bank_account_number': _accountCtrl.text.trim(),
          'bank_ifsc': _ifscCtrl.text.trim(),
          'upi_id': _upiCtrl.text.trim(),
          'vehicle_type': _vehicleType,
        }).eq('user_id', currentUser.id);

        Fluttertoast.showToast(msg: 'Profile updated successfully');

        if (mounted) {
          Navigator.of(context).pop();
        }
      } else {
        Fluttertoast.showToast(msg: 'Error: Cannot save, user not logged in.');
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Error saving profile: $e');
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      maxChildSize: 0.97,
      minChildSize: 0.5,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(
              top: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                width: 1.2,
              ),
            ),
          ),
          child: Column(
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 8,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Edit Profile',
                      style: TextStyle(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: Icon(
                        Icons.close_rounded,
                        color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                        size: 22,
                      ),
                    ),
                  ],
                ),
              ),
              Divider(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                height: 1,
              ),
              Expanded(
                child: Form(
                  key: _formKey,
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(20),
                    children: [
                      _section('1', 'Identity & Contact', [
                        _field(
                          'Full Legal Name',
                          _nameCtrl,
                          Icons.person_outline_rounded,
                          isDark: isDark,
                        ),
                        _field(
                          'Phone Number',
                          _phoneCtrl,
                          Icons.phone_outlined,
                          isDark: isDark,
                          keyboardType: TextInputType.phone,
                        ),
                        _field(
                          'Driver License Number',
                          _dlCtrl,
                          Icons.drive_eta_outlined,
                          isDark: isDark,
                          caps: TextCapitalization.characters,
                        ),
                        _field(
                          'PAN Card Number',
                          _panCtrl,
                          Icons.credit_card_outlined,
                          isDark: isDark,
                          caps: TextCapitalization.characters,
                        ),
                        _field(
                          'Aadhaar Number',
                          _aadhaarCtrl,
                          Icons.badge_outlined,
                          isDark: isDark,
                          keyboardType: TextInputType.number,
                        ),
                      ], isDark),
                      const SizedBox(height: 20),
                      _section('2', 'Vehicle Details', [
                        _vehicleToggle(isDark),
                        _field(
                          'Vehicle Number',
                          _vehicleNumCtrl,
                          Icons.directions_car_outlined,
                          isDark: isDark,
                          caps: TextCapitalization.characters,
                        ),
                        _field(
                          'RC Number',
                          _rcCtrl,
                          Icons.description_outlined,
                          isDark: isDark,
                          caps: TextCapitalization.characters,
                        ),
                      ], isDark),
                      const SizedBox(height: 20),
                      _section('3', 'Payout & Settlement Details', [
                        _field(
                          'Bank Name',
                          _bankNameCtrl,
                          Icons.account_balance_outlined,
                          isDark: isDark,
                        ),
                        _field(
                          'Bank Account Number',
                          _accountCtrl,
                          Icons.numbers_rounded,
                          isDark: isDark,
                          keyboardType: TextInputType.number,
                        ),
                        _field(
                          'IFSC Code',
                          _ifscCtrl,
                          Icons.domain_outlined,
                          isDark: isDark,
                          caps: TextCapitalization.characters,
                        ),
                        _field(
                          'UPI ID (e.g. 9876543210@paytm)',
                          _upiCtrl,
                          Icons.qr_code_2_rounded,
                          isDark: isDark,
                          keyboardType: TextInputType.emailAddress,
                        ),
                      ], isDark),
                      const SizedBox(height: 28),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => Navigator.of(context).pop(),
                              style: OutlinedButton.styleFrom(
                                side: BorderSide(
                                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                ),
                                foregroundColor: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
                              ),
                              child: const Text('Cancel'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: ElevatedButton(
                              onPressed: _isSaving ? null : _save,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.warning,
                                foregroundColor: Colors.black,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
                                textStyle: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                              child: _isSaving
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.black,
                                      ),
                                    )
                                  : const Text('Save & Update'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _section(String num, String title, List<Widget> fields, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
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
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: AppColors.warning,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Center(
                  child: Text(
                    num,
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.warning,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...fields.map(
            (f) =>
                Padding(padding: const EdgeInsets.only(bottom: 12), child: f),
          ),
        ],
      ),
    );
  }

  Widget _field(
    String label,
    TextEditingController ctrl,
    IconData icon, {
    required bool isDark,
    TextInputType? keyboardType,
    TextCapitalization caps = TextCapitalization.none,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 5),
        TextFormField(
          controller: ctrl,
          keyboardType: keyboardType,
          textCapitalization: caps,
          style: TextStyle(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontSize: 14,
          ),
          decoration: InputDecoration(
            filled: true,
            fillColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            prefixIcon: Icon(
              icon,
              color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
              size: 17,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.warning, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  Widget _vehicleToggle(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Vehicle Category',
          style: TextStyle(
            color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            _typeBtn('sedan', '🚗 Sedan', isDark),
            const SizedBox(width: 10),
            _typeBtn('suv', '🚙 SUV', isDark),
          ],
        ),
      ],
    );
  }

  Widget _typeBtn(String type, String label, bool isDark) {
    final isSelected = _vehicleType == type;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _vehicleType = type),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.warning.withValues(alpha: isDark ? 0.2 : 0.12)
                : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected
                  ? AppColors.warning
                  : (isDark ? AppColors.borderDark : AppColors.borderLight),
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected
                  ? AppColors.warning
                  : (isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight),
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ),
      ),
    );
  }
}