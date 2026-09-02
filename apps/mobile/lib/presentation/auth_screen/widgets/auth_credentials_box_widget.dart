import 'package:flutter/material.dart';

// Standalone credentials box — updated to render nothing (hiding demo credentials)
class AuthCredentialsBoxWidget extends StatelessWidget {
  final String email;
  final String password;

  const AuthCredentialsBoxWidget({
    super.key,
    required this.email,
    required this.password,
  });

  @override
  Widget build(BuildContext context) {
    // SizedBox.shrink() renders an empty, invisible widget that takes up zero space.
    // This effectively removes the Demo Credentials box from the login screen.
    return const SizedBox.shrink();
  }
}
