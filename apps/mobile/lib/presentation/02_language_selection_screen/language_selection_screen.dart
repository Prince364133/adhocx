import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

class LanguageOption {
  final String code;
  final String title;
  final String nativeTitle;
  final String symbol;

  const LanguageOption({
    required this.code,
    required this.title,
    required this.nativeTitle,
    required this.symbol,
  });
}

/// Screen 2: Choose Language matching exact design mockup.
class LanguageSelectionScreen extends StatefulWidget {
  const LanguageSelectionScreen({super.key});

  @override
  State<LanguageSelectionScreen> createState() => _LanguageSelectionScreenState();
}

class _LanguageSelectionScreenState extends State<LanguageSelectionScreen> {
  String _selectedCode = 'en';

  final List<LanguageOption> _languages = const [
    LanguageOption(
      code: 'en',
      title: 'English',
      nativeTitle: 'English',
      symbol: '🌐',
    ),
    LanguageOption(
      code: 'hi',
      title: 'Hindi',
      nativeTitle: 'हिंदी (Hindi)',
      symbol: 'क',
    ),
    LanguageOption(
      code: 'ta',
      title: 'Tamil',
      nativeTitle: 'தமிழ் (Tamil)',
      symbol: 'த',
    ),
    LanguageOption(
      code: 'te',
      title: 'Telugu',
      nativeTitle: 'తెలుగు (Telugu)',
      symbol: 'తె',
    ),
    LanguageOption(
      code: 'ml',
      title: 'Malayalam',
      nativeTitle: 'മലയാളം (Malayalam)',
      symbol: 'മ',
    ),
    LanguageOption(
      code: 'kn',
      title: 'Kannada',
      nativeTitle: 'ಕನ್ನಡ (Kannada)',
      symbol: 'ಕ',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xxl,
                vertical: AppSpacing.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Top Navigation Bar ─────────────────────────────────────
                  Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.splashScreen);
                          }
                        },
                        icon: const Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
                        ),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // ── Title & Subtitle ───────────────────────────────────────
                  Text(
                    'Choose Language',
                    style: AppTypography.h1(
                      color: AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Select your preferred language',
                    style: AppTypography.body(
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // ── Language Options List ──────────────────────────────────
                  Expanded(
                    child: ListView.separated(
                      itemCount: _languages.length,
                      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, index) {
                        final lang = _languages[index];
                        final isSelected = lang.code == _selectedCode;

                        return Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => setState(() => _selectedCode = lang.code),
                            borderRadius: BorderRadius.circular(AppRadius.md),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.lg,
                                vertical: AppSpacing.md + 2,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.primarySubtle
                                    : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.md),
                                border: Border.all(
                                  color: isSelected
                                      ? AppColors.primary
                                      : AppColors.borderLight,
                                  width: isSelected ? 1.5 : 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  // Script Symbol
                                  SizedBox(
                                    width: 32,
                                    child: Text(
                                      lang.symbol,
                                      style: TextStyle(
                                        fontSize: lang.code == 'en' ? 18 : 16,
                                        fontWeight: FontWeight.bold,
                                        color: isSelected
                                            ? AppColors.primary
                                            : AppColors.textSecondaryLight,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.sm),

                                  // Language Name
                                  Expanded(
                                    child: Text(
                                      lang.nativeTitle,
                                      style: AppTypography.body(
                                        color: AppColors.textPrimaryLight,
                                        fontWeight: isSelected
                                            ? FontWeight.w600
                                            : FontWeight.normal,
                                      ),
                                    ),
                                  ),

                                  // Selected Radio / Check
                                  if (isSelected)
                                    Container(
                                      width: 22,
                                      height: 22,
                                      decoration: const BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: AppColors.primary,
                                      ),
                                      child: const Icon(
                                        Icons.check,
                                        size: 15,
                                        color: Colors.white,
                                      ),
                                    )
                                  else
                                    Container(
                                      width: 22,
                                      height: 22,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: AppColors.borderSubtleLight,
                                          width: 1.5,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  // ── Bottom Action ──────────────────────────────────────────
                  AppPrimaryButton(
                    text: 'Continue',
                    onPressed: () => context.push(AppRoutes.signInScreen),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
