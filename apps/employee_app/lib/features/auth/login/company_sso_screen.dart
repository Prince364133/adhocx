import 'package:flutter/material.dart';
import 'mobile_number_screen.dart';

/// Legacy screen alias: Replaced completely by [MobileNumberScreen].
/// Email and SSO authentication have been removed as per the SMS phone number authentication mandate.
class CompanySsoScreen extends StatelessWidget {
  const CompanySsoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const MobileNumberScreen();
  }
}
