import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/employee_app_bar.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/widgets/illustration_widgets.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/models/auth_state.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

class CompanySsoScreen extends StatefulWidget {
  const CompanySsoScreen({super.key});

  @override
  State<CompanySsoScreen> createState() => _CompanySsoScreenState();
}

class _CompanySsoScreenState extends State<CompanySsoScreen> {
  final TextEditingController _emailController = TextEditingController();
  bool _isValidEmail = false;

  @override
  void initState() {
    super.initState();
    _emailController.addListener(() {
      final email = _emailController.text.trim();
      final valid = email.contains('@') && email.contains('.') && email.length > 5;
      if (valid != _isValidEmail) {
        setState(() => _isValidEmail = valid);
      }
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSsoSubmit() async {
    final email = _emailController.text.trim();
    if (!_isValidEmail) return;

    final authProvider = context.read<EmployeeAuthProvider>();
    final result = await authProvider.authenticateWithSso(email);

    if (!mounted) return;

    if (result == AuthStatus.authenticated) {
      context.go(AppRoutes.employeeVerified);
    } else if (result == AuthStatus.notEligible) {
      context.go(AppRoutes.transportUnavailable);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.errorMessage ?? 'SSO authentication failed.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<EmployeeAuthProvider>();

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 12),
              // SSO Shield Badge
              const CompanySsoBadge(),

              const SizedBox(height: 28),

              Text(
                'Continue with\nCompany SSO',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.4,
                  height: 1.25,
                ),
              ),

              const SizedBox(height: 8),

              Text(
                'Use your company email to sign in.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),

              const SizedBox(height: 36),

              // Work Email TextField
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
                decoration: InputDecoration(
                  hintText: 'you@company.com',
                  prefixIcon: const Icon(
                    Icons.email_outlined,
                    color: AppColors.textMuted,
                    size: 20,
                  ),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border, width: 1.5),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border, width: 1.5),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.primaryBlue, width: 2),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Continue Button
              EmployeePrimaryButton(
                label: 'Continue',
                isLoading: authProvider.isLoading,
                onPressed: _isValidEmail ? _handleSsoSubmit : null,
              ),

              const SizedBox(height: 24),

              // Divider "or"
              Row(
                children: [
                  const Expanded(child: Divider(color: AppColors.border)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'or',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.textMuted,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const Expanded(child: Divider(color: AppColors.border)),
                ],
              ),

              const SizedBox(height: 20),

              // Link to Mobile Number
              TextButton(
                onPressed: () => context.push(AppRoutes.mobileNumber),
                child: Text(
                  'Use Mobile Number Instead',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryBlue,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}




