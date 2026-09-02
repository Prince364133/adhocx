import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';

import '../../../routes/app_routes.dart';
import '../../../services/auth_service.dart';

class AuthSignInFormWidget extends StatefulWidget {
  final VoidCallback onSuccess;
  final VoidCallback onRegisterTap;

  const AuthSignInFormWidget({
    super.key,
    required this.onSuccess,
    required this.onRegisterTap,
  });

  @override
  State<AuthSignInFormWidget> createState() => _AuthSignInFormWidgetState();
}

class _AuthSignInFormWidgetState extends State<AuthSignInFormWidget> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorText;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorText = null;
    });

    try {
      final rawIdentifier = _identifierController.text.trim();
      final phone = rawIdentifier.startsWith('+') ? rawIdentifier : '+91$rawIdentifier';
      final otp = _passwordController.text.trim().isEmpty ? '1234' : _passwordController.text.trim();

      // 1. Authenticate with AdhocX Backend
      final user = await AuthService.instance.verifyOtp(
        phone: phone,
        otp: otp,
        role: 'DRIVER',
      );

      if (!mounted) return;
      setState(() => _isLoading = false);

      Fluttertoast.showToast(msg: 'Signed in successfully');

      // 2. Smart Routing based on real backend verificationStatus
      if (user.isPending) {
        widget.onSuccess(); // Routes to KYC Upload Screen
      } else if (user.isVerified) {
        context.go(AppRoutes.tripsScreen); // Verified driver goes to Trips Screen
      } else {
        context.go(AppRoutes.waitlistGateScreen); // UNDER_REVIEW goes to Waitlist Gate
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorText = 'Login failed: ${error.toString().replaceAll('Exception: ', '').replaceAll('ApiException', '')}';
      });
      debugPrint('AdhocX Login Error: $error');
    }
  }

  Future<void> _resetPassword() async {
    final rawIdentifier = _identifierController.text.trim();

    if (rawIdentifier.isEmpty) {
      Fluttertoast.showToast(
        msg: 'Please enter your phone number first.',
      );
      return;
    }

    final phone = rawIdentifier.startsWith('+') ? rawIdentifier : '+91$rawIdentifier';

    try {
      await AuthService.instance.requestOtp(phone);
      Fluttertoast.showToast(msg: 'Login OTP sent to $phone!');
    } catch (error) {
      Fluttertoast.showToast(
        msg: 'Error sending OTP. Please check your phone number.',
      );
      debugPrint('Reset Password Error: $error');
    }
  }


  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildField(
            controller: _identifierController,
            label: 'Phone Number or Email',
            hint: '9876543210 or driver@email.com',
            icon: 'phone',
            keyboardType: TextInputType.emailAddress,
            validator: (v) {
              if (v == null || v.trim().isEmpty) {
                return 'Enter phone number or email';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          _buildPasswordField(),

          if (_errorText != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFef4444).withAlpha(26),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: const Color(0xFFef4444).withAlpha(77),
                ),
              ),
              child: Column(
                children: [
                  Text(
                    _errorText!,
                    style: const TextStyle(
                      color: Color(0xFFef4444),
                      fontSize: 13,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 10),
                  GestureDetector(
                    onTap: _resetPassword,
                    child: const Text(
                      'Forgot password? Tap here to reset',
                      style: TextStyle(
                        color: Color(0xFF22c55e),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        decoration: TextDecoration.underline,
                        decorationColor: Color(0xFF22c55e),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 20),
          _buildSubmitButton(),
          const SizedBox(height: 16),
          Center(
            child: GestureDetector(
              onTap: widget.onRegisterTap,
              child: const Text(
                'New driver? Register here',
                style: TextStyle(
                  color: Color(0xFF22c55e),
                  fontSize: 13,
                  decoration: TextDecoration.underline,
                  decorationColor: Color(0xFF22c55e),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required String icon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF94a3b8),
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          cursorColor: Colors.black, // Added to prevent invisible cursor
          style: const TextStyle(color: Colors.black, fontSize: 15), // Changed from Colors.white
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(
              _iconFromName(icon),
              color: const Color(0xFF94a3b8),
              size: 20,
            ),
          ),
          validator: validator,
        ),
      ],
    );
  }

  Widget _buildPasswordField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Password',
          style: TextStyle(
            color: Color(0xFF94a3b8),
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          cursorColor: Colors.black, // Added to prevent invisible cursor
          style: const TextStyle(color: Colors.black, fontSize: 15), // Changed from Colors.white
          decoration: InputDecoration(
            hintText: '••••••••',
            prefixIcon: const Icon(
              Icons.lock_outline_rounded,
              color: Color(0xFF94a3b8),
              size: 20,
            ),
            suffixIcon: GestureDetector(
              onTap: () => setState(() => _obscurePassword = !_obscurePassword),
              child: Icon(
                _obscurePassword
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
                color: const Color(0xFF94a3b8),
                size: 20,
              ),
            ),
          ),
          validator: (v) {
            if (v == null || v.isEmpty) return 'Enter your password';
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
      height: 50,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _signIn,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF22c55e),
          foregroundColor: const Color(0xFF000000),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          disabledBackgroundColor: const Color(0xFF22c55e).withAlpha(128),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Color(0xFF000000),
                ),
              )
            : const Text(
                'Sign In',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
      ),
    );
  }

  IconData _iconFromName(String name) {
    switch (name) {
      case 'phone':
        return Icons.phone_outlined;
      default:
        return Icons.circle_outlined;
    }
  }
}