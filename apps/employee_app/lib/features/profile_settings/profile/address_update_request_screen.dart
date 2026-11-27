import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../shared/components/components.dart';
import '../../../state/employee_feature_provider.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../../../theme/employee_palette.dart';

class AddressUpdateRequestScreen extends StatefulWidget {
  const AddressUpdateRequestScreen({super.key});

  @override
  State<AddressUpdateRequestScreen> createState() =>
      _AddressUpdateRequestScreenState();
}

class _AddressUpdateRequestScreenState
    extends State<AddressUpdateRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _house;
  late final TextEditingController _building;
  late final TextEditingController _locality;
  late final TextEditingController _landmark;
  late final TextEditingController _city;
  late final TextEditingController _state;
  late final TextEditingController _pin;
  late final TextEditingController _details;
  late final TextEditingController _reason;

  @override
  void initState() {
    super.initState();
    _house = TextEditingController();
    _building = TextEditingController();
    _locality = TextEditingController();
    _landmark = TextEditingController();
    _city = TextEditingController();
    _state = TextEditingController();
    _pin = TextEditingController();
    _details = TextEditingController();
    _reason = TextEditingController();
  }

  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    final address = context.read<EmployeeFeatureProvider>().registeredAddress;
    _house.text = address.houseNumber;
    _building.text = address.building;
    _locality.text = address.locality;
    _landmark.text = address.landmark;
    _city.text = address.city;
    _state.text = address.state;
    _pin.text = address.pinCode;
    _details.text = address.additionalDetails;
    _initialized = true;
  }

  @override
  void dispose() {
    _house.dispose();
    _building.dispose();
    _locality.dispose();
    _landmark.dispose();
    _city.dispose();
    _state.dispose();
    _pin.dispose();
    _details.dispose();
    _reason.dispose();
    super.dispose();
  }

  EmployeeAddress get _proposedAddress => EmployeeAddress(
        houseNumber: _house.text.trim(),
        building: _building.text.trim(),
        locality: _locality.text.trim(),
        landmark: _landmark.text.trim(),
        city: _city.text.trim(),
        state: _state.text.trim(),
        pinCode: _pin.text.trim(),
        additionalDetails: _details.text.trim(),
      );

  Future<void> _submit(EmployeeFeatureProvider features) async {
    if (!_formKey.currentState!.validate()) return;
    await features.submitAddressRequest(
      proposedAddress: _proposedAddress,
      reason: _reason.text.trim(),
    );
    if (!mounted) return;
    Navigator.of(context).pop();
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    bool required = false,
    TextInputType? keyboardType,
  }) =>
      TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        validator: required
            ? (value) {
                if (value == null || value.trim().isEmpty) {
                  return '$label is required';
                }
                return null;
              }
            : null,
        decoration: InputDecoration(labelText: label),
      );

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final features = context.watch<EmployeeFeatureProvider>();
    final hasPending = features.addressRequests.any(
      (request) =>
          request['status']?.toString().toUpperCase() == 'PENDING',
    );

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Request Address Change'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.pageHorizontal),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Registered address',
                  style: AppTypography.h4(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                FeatureSectionCard(
                  borderColor: p.accent.withAlpha(80),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.home_rounded, color: p.accent),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Text(
                          features.registeredAddress.fullAddress,
                          style: AppTypography.small(
                            color: p.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),
                Text(
                  'Proposed address',
                  style: AppTypography.h4(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                FeatureSectionCard(
                  child: Column(
                    children: [
                      _field(_house, 'House / Flat Number', required: true),
                      const SizedBox(height: AppSpacing.md),
                      _field(_building, 'Building / Street Name',
                          required: true),
                      const SizedBox(height: AppSpacing.md),
                      _field(_locality, 'Area / Locality', required: true),
                      const SizedBox(height: AppSpacing.md),
                      _field(_landmark, 'Landmark'),
                      const SizedBox(height: AppSpacing.md),
                      Row(
                        children: [
                          Expanded(
                            child: _field(_city, 'City', required: true),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: _field(_state, 'State', required: true),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),
                      TextFormField(
                        controller: _pin,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        validator: (value) {
                          final pin = value?.trim() ?? '';
                          if (pin.isEmpty) return 'PIN Code is required';
                          if (!RegExp(r'^[1-9][0-9]{5}$').hasMatch(pin)) {
                            return 'Enter a valid 6-digit PIN Code';
                          }
                          return null;
                        },
                        decoration:
                            const InputDecoration(labelText: 'PIN Code'),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      TextFormField(
                        controller: _details,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Additional Address Details',
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                TextFormField(
                  controller: _reason,
                  minLines: 3,
                  maxLines: 5,
                  validator: (value) {
                    if (value == null || value.trim().length < 10) {
                      return 'Please explain the address change';
                    }
                    return null;
                  },
                  decoration: const InputDecoration(
                    labelText: 'Reason for Address Change',
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                if (hasPending)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    margin: const EdgeInsets.only(bottom: AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.warningContainer,
                      borderRadius: AppRadius.borderLg,
                    ),
                    child: Text(
                      'A pending address request already exists. Its status must be resolved before another request can be submitted.',
                      style: AppTypography.small(
                        color: AppColors.warningText,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                EmployeePrimaryButton(
                  label: 'Submit Request',
                  icon: Icons.send_rounded,
                  onPressed: hasPending ? null : () => _submit(features),
                ),
                const SizedBox(height: AppSpacing.sm),
                EmployeeSecondaryButton(
                  label: 'Cancel',
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
                const SizedBox(height: AppSpacing.xxl),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
