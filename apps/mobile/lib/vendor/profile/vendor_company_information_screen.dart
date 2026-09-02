import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class VendorCompanyInformationScreen extends StatelessWidget {
  const VendorCompanyInformationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

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
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.edit_outlined, color: Color(0xFF6C5CE7)),
          ),
        ],
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
                      decoration: BoxDecoration(color: const Color(0xFF6C5CE7).withValues(alpha: 0.12), shape: BoxShape.circle),
                      child: const Icon(Icons.apartment, size: 36, color: Color(0xFF6C5CE7)),
                    ),
                    const SizedBox(height: 10),
                    Text('ABC Travels Pvt. Ltd.', style: AppTypography.h2(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    Text('Gurugram, Haryana', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
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
                    _buildRow(context, 'Company Name', 'ABC Travels Pvt. Ltd.', isDark),
                    const Divider(),
                    _buildRow(context, 'GST Number', '06ABCDE1234F1ZS', isDark),
                    const Divider(),
                    _buildRow(context, 'PAN Number', 'ABCDE1234F', isDark),
                    const Divider(),
                    _buildRow(context, 'Business Type', 'Travel & Transport', isDark),
                    const Divider(),
                    _buildRow(context, 'Established On', '15 Jan 2018', isDark),
                    const Divider(),
                    _buildRow(context, 'Registered Address', 'DLF Cyber City, Gurugram,\nHaryana - 122002', isDark),
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
