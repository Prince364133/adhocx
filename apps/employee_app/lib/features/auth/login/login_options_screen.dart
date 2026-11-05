import 'package:flutter/material.dart';
import 'mobile_number_screen.dart';

/// Legacy screen alias: Replaced by MobileNumberScreen directly.
/// The intermediate 'Sign in to your company account' screen was removed.
class LoginOptionsScreen extends StatelessWidget {
  const LoginOptionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const MobileNumberScreen();
  }
}
