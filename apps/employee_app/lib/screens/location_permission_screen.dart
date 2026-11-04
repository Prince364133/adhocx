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

class LocationPermissionScreen extends StatelessWidget {
  const LocationPermissionScreen({super.key});

  Future<void> _handleAllow(BuildContext context) async {
    final permissionProvider = context.read<EmployeePermissionProvider>();
    await permissionProvider.requestLocationPermission();
    if (context.mounted) {
      context.push(AppRoutes.permissionNotification);
    }
  }

  void _handleSkip(BuildContext context) {
    context.read<EmployeePermissionProvider>().skipLocation();
    context.push(AppRoutes.permissionNotification);
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

              // Circular Location Badge
              const PermissionBadge(
                icon: Icons.location_on_rounded,
                iconColor: AppColors.primaryBlue,
                backgroundColor: Color(0xFFEFF6FF),
              ),

              const SizedBox(height: 32),

              Text(
                'Allow Location Access',
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
                  'We use your location to show pickup updates, trip tracking and estimated arrival time.',
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

              // Primary "Allow Location" Button
              EmployeePrimaryButton(
                label: 'Allow Location',
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
