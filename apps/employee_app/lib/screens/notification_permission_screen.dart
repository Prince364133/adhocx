import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../theme/app_colors.dart';
import '../widgets/employee_app_bar.dart';
import '../widgets/employee_primary_button.dart';
import '../widgets/illustration_widgets.dart';
import '../state/employee_permission_provider.dart';
import '../routes/app_routes.dart';

class NotificationPermissionScreen extends StatelessWidget {
  const NotificationPermissionScreen({super.key});

  Future<void> _handleAllow(BuildContext context) async {
    final permissionProvider = context.read<EmployeePermissionProvider>();
    await permissionProvider.requestNotificationPermission();
    if (context.mounted) {
      context.push(AppRoutes.onboardingSchedule);
    }
  }

  void _handleSkip(BuildContext context) {
    context.read<EmployeePermissionProvider>().skipNotifications();
    context.push(AppRoutes.onboardingSchedule);
  }

  @override
  Widget build(BuildContext context) {
    final permissionProvider = context.watch<EmployeePermissionProvider>();

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(),

              // Circular Notification Bell Badge
              const PermissionBadge(
                icon: Icons.notifications_active_rounded,
                iconColor: AppColors.primaryBlue,
                backgroundColor: Color(0xFFEFF6FF),
              ),

              const SizedBox(height: 32),

              Text(
                'Enable Notifications',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.4,
                ),
              ),

              const SizedBox(height: 12),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Get trip updates, driver arrival alerts, shift changes and important safety notifications.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                    height: 1.5,
                  ),
                ),
              ),

              const Spacer(),

              // Primary "Allow Notifications" Button
              EmployeePrimaryButton(
                label: 'Allow Notifications',
                isLoading: permissionProvider.isLoading,
                onPressed: () => _handleAllow(context),
              ),

              const SizedBox(height: 12),

              // "Not Now" Text Button
              TextButton(
                onPressed: () => _handleSkip(context),
                child: Text(
                  'Not Now',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
