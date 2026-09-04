import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../../language_selection_widget.dart';
import './auth_language_switcher_widget.dart';

/// Centralized Auth Header with Brand Identity, Role Indicator, and Language Switcher.
class AuthHeaderWidget extends StatelessWidget {
  final String role; // 'DRIVER' or 'VENDOR'

  const AuthHeaderWidget({
    super.key,
    required this.role,
  });

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isDriver = role == 'DRIVER';

    return Column(
      children: [
        // Top Language Switcher Bar
        Align(
          alignment: Alignment.centerRight,
          child: AuthLanguageSwitcherWidget(
            selected: languageProvider.currentLocale.languageCode.toUpperCase(),
            onChanged: languageProvider.setLanguage,
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        // Brand Icon / Logo
        Container(
          width: 76,
          height: 76,
          decoration: BoxDecoration(
            color: AppColors.surfaceDark,
            borderRadius: AppRadius.borderXxl,
            border: Border.all(
              color: isDriver
                  ? AppColors.accentGreen.withAlpha(90)
                  : AppColors.primary.withAlpha(90),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: (isDriver ? AppColors.accentGreen : AppColors.primary)
                    .withAlpha(40),
                blurRadius: 24,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.asset(
              'assets/images/adhocx_icon.png',
              width: 76,
              height: 76,
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => Icon(
                isDriver ? Icons.local_taxi_rounded : Icons.business_rounded,
                size: 36,
                color: isDriver ? AppColors.accentGreen : AppColors.primary,
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),

        // Portal Heading
        Text(
          isDriver ? 'AdhocX Driver Partner' : 'AdhocX User Portal',
          style: AppTypography.h2(color: AppColors.textPrimaryDark),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpacing.xs),

        // Portal Subtitle
        Text(
          isDriver
              ? 'On-Demand Fleet Dispatch & Trip Management'
              : 'Corporate Mobility & Requirement Fulfillment',
          style: AppTypography.small(color: AppColors.textSecondaryDark),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
