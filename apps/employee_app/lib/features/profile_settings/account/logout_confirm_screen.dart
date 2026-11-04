import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/widgets/batch_08_illustrations.dart';
import 'package:adhocx_employee/shared/components/components.dart';

/// Screen: Logout / Sign Out Screen
/// Uses design system components: EmployeeAppBar, EmployeeConfirmationSheet.
class LogoutConfirmScreen extends StatefulWidget {
  const LogoutConfirmScreen({super.key});

  @override
  State<LogoutConfirmScreen> createState() => _LogoutConfirmScreenState();
}

class _LogoutConfirmScreenState extends State<LogoutConfirmScreen> {
  bool _isSigningOut = false;

  Future<void> _handleSignOut() async {
    setState(() => _isSigningOut = true);
    final authProvider = Provider.of<EmployeeAuthProvider>(context, listen: false);
    await authProvider.signOut();
    if (mounted) {
      context.go(AppRoutes.welcome);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const EmployeeAppBar(
        title: '',
        backgroundColor: Colors.white,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              EmployeeConfirmationSheet(
                illustration: const Center(child: SignOutConfirmBadge()),
                title: 'Sign Out?',
                description: "You'll be signed out of your AdhocX corporate account on this device.",
                confirmLabel: 'Sign Out',
                isDestructive: true,
                isLoading: _isSigningOut,
                onConfirm: _handleSignOut,
                cancelLabel: 'Cancel',
                onCancel: () => Navigator.of(context).pop(),
              ),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}

