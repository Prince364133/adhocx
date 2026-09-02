import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../theme/theme_provider.dart';

/// Screen 5: App Settings matching exact design guidelines.
class AppSettingsScreen extends StatefulWidget {
  const AppSettingsScreen({super.key});

  @override
  State<AppSettingsScreen> createState() => _AppSettingsScreenState();
}

class _AppSettingsScreenState extends State<AppSettingsScreen> {
  bool _autoAccept = true;
  bool _voiceGuidance = true;
  bool _highContrast = false;

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.profileScreen);
                          }
                        },
                        icon: const Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'App Settings',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Settings List ─────────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      // Appearance Section
                      Text(
                        'Appearance & Theme',
                        style: AppTypography.caption(
                          color: AppColors.textMutedLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Column(
                          children: [
                            ListTile(
                              leading: const Icon(Icons.brightness_medium_outlined, color: AppColors.primary),
                              title: Text(
                                'App Theme',
                                style: AppTypography.body(
                                  color: AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              subtitle: Text(
                                themeProvider.themeModeLabel,
                                style: AppTypography.caption(color: AppColors.textSecondaryLight),
                              ),
                              trailing: const Icon(Icons.chevron_right, color: AppColors.textMutedLight),
                              onTap: () {
                                context.push(AppRoutes.profileScreen);
                              },
                            ),
                            const Divider(height: 1, color: AppColors.borderLight),
                            SwitchListTile(
                              secondary: const Icon(Icons.contrast_outlined, color: AppColors.primary),
                              title: Text(
                                'High Contrast Dark Mode',
                                style: AppTypography.body(
                                  color: AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              subtitle: Text(
                                'Enhance visibility at night',
                                style: AppTypography.caption(color: AppColors.textSecondaryLight),
                              ),
                              value: _highContrast,
                              activeColor: AppColors.primary,
                              onChanged: (val) => setState(() => _highContrast = val),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // Navigation & Audio Section
                      Text(
                        'Navigation & Audio',
                        style: AppTypography.caption(
                          color: AppColors.textMutedLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Column(
                          children: [
                            SwitchListTile(
                              secondary: const Icon(Icons.volume_up_outlined, color: AppColors.primary),
                              title: Text(
                                'Voice Navigation Guidance',
                                style: AppTypography.body(
                                  color: AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              subtitle: Text(
                                'Spoken turn-by-turn directions',
                                style: AppTypography.caption(color: AppColors.textSecondaryLight),
                              ),
                              value: _voiceGuidance,
                              activeColor: AppColors.primary,
                              onChanged: (val) => setState(() => _voiceGuidance = val),
                            ),
                            const Divider(height: 1, color: AppColors.borderLight),
                            SwitchListTile(
                              secondary: const Icon(Icons.flash_on_outlined, color: AppColors.primary),
                              title: Text(
                                'Auto-Accept Matching Trips',
                                style: AppTypography.body(
                                  color: AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              subtitle: Text(
                                'Automatically accept high-score offers',
                                style: AppTypography.caption(color: AppColors.textSecondaryLight),
                              ),
                              value: _autoAccept,
                              activeColor: AppColors.primary,
                              onChanged: (val) => setState(() => _autoAccept = val),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // Cache & Maintenance
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: ListTile(
                          leading: const Icon(Icons.cleaning_services_outlined, color: AppColors.primary),
                          title: Text(
                            'Clear App Cache',
                            style: AppTypography.body(
                              color: AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          subtitle: Text(
                            'Free up storage space (24.8 MB)',
                            style: AppTypography.caption(color: AppColors.textSecondaryLight),
                          ),
                          onTap: () {
                            Fluttertoast.showToast(
                              msg: 'App cache cleared!',
                              backgroundColor: AppColors.accentGreenDark,
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxl),

                      // App Version Footer Badge
                      Center(
                        child: Column(
                          children: [
                            Text(
                              'AdhocX Driver Partner',
                              style: AppTypography.caption(
                                color: AppColors.textMutedLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'v2.4.1 (Build 1042)',
                              style: AppTypography.caption(color: AppColors.textMutedLight).copyWith(fontSize: 10),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
