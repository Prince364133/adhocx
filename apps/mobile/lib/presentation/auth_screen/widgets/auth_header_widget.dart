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

        // Brand Logo (Text-based)
        RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: 'Adhoc',
                style: AppTypography.display(
                  color: AppColors.textPrimaryDark,
                  fontWeight: FontWeight.w800,
                  fontSize: 38,
                ),
              ),
              TextSpan(
                text: 'X',
                style: const TextStyle(
                  color: Color(0xFFFF6200),
                  fontWeight: FontWeight.w900,
                  fontSize: 40,
                  fontFamily: 'Inter',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),


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
