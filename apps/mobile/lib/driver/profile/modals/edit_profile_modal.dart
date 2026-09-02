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
    // Pre-filling the text controllers with the passed profile data
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
        // Execute the real Supabase UPDATE query
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
        }).eq('user_id', currentUser.id); // Securely targets the logged-in user

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
    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      maxChildSize: 0.97,
      minChildSize: 0.5,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF020617),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(top: BorderSide(color: Color(0xFF334155))),
          ),
          child: Column(
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFF334155),
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
                    const Text(
                      'Edit Profile',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: const Icon(
                        Icons.close_rounded,
                        color: Color(0xFF94a3b8),
                        size: 22,
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(color: Color(0xFF334155), height: 1),
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
                        ),
                        _field(
                          'Phone Number',
                          _phoneCtrl,
                          Icons.phone_outlined,
                          keyboardType: TextInputType.phone,
                        ),
                        _field(
                          'Driver License Number',
                          _dlCtrl,
                          Icons.drive_eta_outlined,
                          caps: TextCapitalization.characters,
                        ),
                        _field(
                          'PAN Card Number',
                          _panCtrl,
                          Icons.credit_card_outlined,
                          caps: TextCapitalization.characters,
                        ),
                        _field(
                          'Aadhaar Number',
                          _aadhaarCtrl,
                          Icons.badge_outlined,
                          keyboardType: TextInputType.number,
                        ),
                      ]),
                      const SizedBox(height: 20),
                      _section('2', 'Vehicle Details', [
                        _vehicleToggle(),
                        _field(
                          'Vehicle Number',
                          _vehicleNumCtrl,
                          Icons.directions_car_outlined,
                          caps: TextCapitalization.characters,
                        ),
                        _field(
                          'RC Number',
                          _rcCtrl,
                          Icons.article_outlined,
                          caps: TextCapitalization.characters,
                        ),
                      ]),
                      const SizedBox(height: 20),
                      _section('3', 'Banking Details', [
                        _field(
                          'Bank Name',
                          _bankNameCtrl,
                          Icons.account_balance_outlined,
                        ),
                        _field(
                          'Account Number',
                          _accountCtrl,
                          Icons.credit_card_outlined,
                          keyboardType: TextInputType.number,
                        ),
                        _field(
                          'IFSC Code',
                          _ifscCtrl,
                          Icons.code_rounded,
                          caps: TextCapitalization.characters,
                        ),
                        _field('UPI ID', _upiCtrl, Icons.payment_rounded),
                      ]),
                      const SizedBox(height: 28),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => Navigator.of(context).pop(),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF94a3b8),
                                side: const BorderSide(
                                  color: Color(0xFF334155),
                                ),
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
                                backgroundColor: const Color(0xFFf59e0b),
                                foregroundColor: const Color(0xFF1a0a00),
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
                                        color: Color(0xFF1a0a00),
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

  Widget _section(String num, String title, List<Widget> fields) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1e293b),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF334155)),
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
                  color: const Color(0xFFf59e0b),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Center(
                  child: Text(
                    num,
                    style: const TextStyle(
                      color: Color(0xFF1a0a00),
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
                  color: Color(0xFFf59e0b),
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
    TextInputType? keyboardType,
    TextCapitalization caps = TextCapitalization.none,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF94a3b8),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 5),
        TextFormField(
          controller: ctrl,
          keyboardType: keyboardType,
          textCapitalization: caps,
          style: const TextStyle(color: Colors.white, fontSize: 14),
          decoration: InputDecoration(
            prefixIcon: Icon(icon, color: const Color(0xFF94a3b8), size: 17),
          ),
        ),
      ],
    );
  }

  Widget _vehicleToggle() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Vehicle Category',
          style: TextStyle(
            color: Color(0xFF94a3b8),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            _typeBtn('sedan', '🚗 Sedan'),
            const SizedBox(width: 10),
            _typeBtn('suv', '🚙 SUV'),
          ],
        ),
      ],
    );
  }

  Widget _typeBtn(String type, String label) {
    final isSelected = _vehicleType == type;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _vehicleType = type),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? const Color(0xFFf59e0b).withAlpha(31)
                : const Color(0xFF0f172a),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected
                  ? const Color(0xFFf59e0b)
                  : const Color(0xFF334155),
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected
                  ? const Color(0xFFf59e0b)
                  : const Color(0xFF94a3b8),
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ),
      ),
    );
  }
}