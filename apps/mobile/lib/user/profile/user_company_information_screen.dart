import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/auth_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserCompanyInformationScreen extends StatelessWidget {
  const UserCompanyInformationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final user = AuthService.instance.currentUser;
    final userName = user?.fullName ?? 'Business Organization';
    final userEmail = user?.email ?? '—';
    final userPhone = user?.phone ?? '—';
    final role = user?.role ?? 'VENDOR / BOOKER';

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('Company Information', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            children: [
              // Company Header Avatar
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.12), shape: BoxShape.circle),
                      child: Icon(Icons.apartment, size: 36, color: AppColors.primary),
                    ),
                    const SizedBox(height: 10),
                    Text(userName, style: AppTypography.h2(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    Text(role, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              // Details Card Table
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    _buildRow(context, 'Account / Organization', userName, isDark),
                    const Divider(),
                    _buildRow(context, 'Primary Email', userEmail, isDark),
                    const Divider(),
                    _buildRow(context, 'Contact Number', userPhone, isDark),
                    const Divider(),
                    _buildRow(context, 'Account Type', role, isDark),
                    const Divider(),
                    _buildRow(context, 'Platform Verification', (user?.verificationStatus ?? 'PENDING').toUpperCase(), isDark),
                    const Divider(),
                    _buildRow(context, 'Registered Office', '—', isDark),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(BuildContext context, String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
    );
  }
}
