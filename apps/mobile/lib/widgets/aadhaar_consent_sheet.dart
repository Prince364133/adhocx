import 'package:flutter/material.dart';
import '../services/digio_service.dart';

/// Shows the Aadhaar processing consent sheet. Resolves to true only when the driver ticks the
/// checkbox and taps "I agree"; dismissing or declining resolves to false.
Future<bool> showAadhaarConsentSheet(BuildContext context) async {
  final result = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    isDismissible: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (_) => const AadhaarConsentSheet(),
  );
  return result == true;
}

/// Runs [action] only after the driver's Aadhaar consent is recorded (asking if needed).
/// Returns null when the driver declines.
Future<T?> withAadhaarConsent<T>(BuildContext context, Future<T> Function() action) {
  return DigioService.instance.runWithAadhaarConsent<T>(
    askUser: () => context.mounted ? showAadhaarConsentSheet(context) : Future.value(false),
    action: action,
  );
}

class AadhaarConsentSheet extends StatefulWidget {
  const AadhaarConsentSheet({super.key});

  static const String title = 'Consent to verify your Aadhaar';
  static const String checkboxLabel =
      'I have read this and agree to AdhocX verifying my Aadhaar for driver onboarding.';

  @override
  State<AadhaarConsentSheet> createState() => _AadhaarConsentSheetState();
}

class _AadhaarConsentSheetState extends State<AadhaarConsentSheet> {
  bool _checked = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bullet = theme.textTheme.bodyMedium;
    Widget point(String text) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 2, right: 8),
                child: Icon(Icons.check_circle_outline, size: 18),
              ),
              Expanded(child: Text(text, style: bullet)),
            ],
          ),
        );

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(20, 16, 20, 16 + MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.verified_user_outlined),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(AadhaarConsentSheet.title, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              point('Why: to confirm your identity before you can drive with AdhocX.'),
              point('Who: Our authorized UIDAI/DigiLocker verification gateway processes your Aadhaar on AdhocX\'s behalf.'),
              point('What we keep: a masked copy of your Aadhaar (first 8 digits hidden) is used on your profile.'),
              point('Your choice: you can withdraw this consent at any time by contacting AdhocX support. You can also verify through DigiLocker instead.'),
              const SizedBox(height: 4),
              CheckboxListTile(
                key: const Key('aadhaar_consent_checkbox'),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                value: _checked,
                onChanged: (v) => setState(() => _checked = v ?? false),
                title: Text(AadhaarConsentSheet.checkboxLabel, style: theme.textTheme.bodySmall),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      key: const Key('aadhaar_consent_decline'),
                      onPressed: () => Navigator.of(context).pop(false),
                      child: const Text('Not now'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      key: const Key('aadhaar_consent_accept'),
                      onPressed: _checked ? () => Navigator.of(context).pop(true) : null,
                      child: const Text('I agree'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
