import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthSignUpFormWidget extends StatefulWidget {
  final VoidCallback onSuccess;
  final VoidCallback onSignInTap;

  const AuthSignUpFormWidget({
    super.key,
    required this.onSuccess,
    required this.onSignInTap,
  });

  @override
  State<AuthSignUpFormWidget> createState() => _AuthSignUpFormWidgetState();
}

class _AuthSignUpFormWidgetState extends State<AuthSignUpFormWidget> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorText;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _createAccount() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isLoading = true;
      _errorText = null;
    });

    try {
      final phone = _phoneController.text.trim();
      final password = _passwordController.text;
      // Use synthetic email pattern consistent with sign-in
      final email = '$phone@adhocx.in';

      // 1. Sign up with Supabase Auth
      final authResponse = await Supabase.instance.client.auth.signUp(
        email: email,
        password: password,
      );

      final userId = authResponse.user?.id;
      if (userId == null) {
        throw Exception('Registration failed: Supabase did not return a user ID.');
      }

      // 2. Upsert a pending driver_profiles row so the user exists in the table
      await Supabase.instance.client.from('driver_profiles').upsert({
        'user_id': userId, // <--- CHANGED FROM 'id' TO 'user_id'
        'phone': '+91$phone', 
        'approval_status': 'pending',
        'is_approved': false,
      }, onConflict: 'user_id'); // <--- ADDED ONCONFLICT RULE

      if (!mounted) return;
      setState(() => _isLoading = false);

      Fluttertoast.showToast(msg: 'Account created! Complete your KYC.');
      widget.onSuccess();
      
    } on AuthException catch (error) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorText = 'Auth Error: ${error.message}';
      });
      debugPrint('Supabase SignUp AuthException: $error');
      
    } on PostgrestException catch (error) {
      // THIS CATCHES DATABASE / RLS ERRORS
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorText = 'Database Error: ${error.message}';
      });
      debugPrint('Supabase SignUp PostgrestException: $error');
      
    } catch (error) {
      // SHOWS THE EXACT ERROR INSTEAD OF HIDING IT
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorText = error.toString().replaceAll('Exception: ', ''); 
      });
      debugPrint('Supabase SignUp Error: $error');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildLabel('Mobile Number'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(10),
            ],
            cursorColor: Colors.black, // Added to prevent invisible cursor
            style: const TextStyle(color: Colors.black, fontSize: 15), // Changed from Colors.white
            decoration: const InputDecoration(
              hintText: '9876543210',
              prefixIcon: Icon(
                Icons.phone_outlined,
                color: Color(0xFF94a3b8),
                size: 20,
              ),
            ),
            validator: (v) {
              if (v == null || v.length != 10) {
                return 'Enter a valid 10-digit mobile number';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          _buildLabel('Password'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            cursorColor: Colors.black, // Added to prevent invisible cursor
            style: const TextStyle(color: Colors.black, fontSize: 15), // Changed from Colors.white
            decoration: InputDecoration(
              hintText: 'Min 6 characters',
              prefixIcon: const Icon(
                Icons.lock_outline_rounded,
                color: Color(0xFF94a3b8),
                size: 20,
              ),
              suffixIcon: GestureDetector(
                onTap: () =>
                    setState(() => _obscurePassword = !_obscurePassword),
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
              if (v == null || v.length < 6) {
                return 'Password must be at least 6 characters';
              }
              return null;
            },
          ),
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
              child: Text(
                _errorText!,
                style: const TextStyle(color: Color(0xFFef4444), fontSize: 13),
              ),
            ),
          ],
          const SizedBox(height: 20),
          SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _createAccount,
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
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Create Account',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                        SizedBox(width: 6),
                        Text(
                          '→',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: GestureDetector(
              onTap: widget.onSignInTap,
              child: const Text(
                'Already registered? Sign In',
                style: TextStyle(
                  color: Color(0xFF22c55e),
                  fontSize: 13,
                  decoration: TextDecoration.underline,
                  decorationColor: Color(0xFF22c55e),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0d1117),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF1a2332)),
            ),
            child: RichText(
              textAlign: TextAlign.center,
              text: const TextSpan(
                style: TextStyle(color: Color(0xFF94a3b8), fontSize: 12),
                children: [
                  TextSpan(text: 'By registering you agree to our '),
                  TextSpan(
                    text: 'Terms of Service',
                    style: TextStyle(
                      color: Color(0xFF22c55e),
                      decoration: TextDecoration.underline,
                    ),
                  ),
                  TextSpan(text: ' and '),
                  TextSpan(
                    text: 'Privacy Policy',
                    style: TextStyle(
                      color: Color(0xFF22c55e),
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        color: Color(0xFF94a3b8),
        fontSize: 13,
        fontWeight: FontWeight.w500,
      ),
    );
  }
}