import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_card.dart';
import './widgets/auth_header_widget.dart';
import './widgets/auth_otp_step_widget.dart';
import './widgets/auth_phone_step_widget.dart';

enum AuthStep { phone, otp }

/// Centralized Auth Screen for AdhocX Mobile (Driver & Vendor).
/// Strictly complies with docs/04_DESIGN_SYSTEM.md and docs/06_SCREEN_SPECIFICATIONS.md.
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  AuthStep _currentStep = AuthStep.phone;
  String _activeRole = 'DRIVER'; // 'DRIVER' or 'VENDOR'

  // Preserved OTP state
  String _targetPhone = '';
  bool _isRegister = false;

  void _onOtpRequested({
    required String phone,
    required String role,
    required bool isRegister,
    String? fullName,
    String? companyName,
  }) {
    setState(() {
      _targetPhone = phone;
      _activeRole = role;
      _isRegister = isRegister;
      _currentStep = AuthStep.otp;
    });
  }


  void _onVerificationSuccess(UserModel user) {
    if (user.isDriver) {
      if (user.isPending) {
        context.go(AppRoutes.kycUploadScreen);
      } else if (user.isVerified) {
        context.go(AppRoutes.tripsScreen);
      } else {
        context.go(AppRoutes.waitlistGateScreen);
      }
    } else {
      if (user.isPending) {
        context.go(AppRoutes.kycUploadScreen);
      } else {
        context.go(AppRoutes.tripsScreen);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isTablet = size.width >= 600;

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: isTablet ? AppSpacing.xxxl : AppSpacing.lg,
              vertical: AppSpacing.md,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Header (Logo + Dynamic Title + Language Selector) ──────
                  AuthHeaderWidget(role: _activeRole),
                  const SizedBox(height: AppSpacing.xxl),

                  // ── Main Card Container ────────────────────────────────────
                  AppCard(
                    padding: AppSpacing.paddingXl,
                    backgroundColor: AppColors.surfaceDark,
                    borderColor: AppColors.borderDark,
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 240),
                      switchInCurve: Curves.easeOutCubic,
                      switchOutCurve: Curves.easeInCubic,
                      transitionBuilder: (child, animation) {
                        return FadeTransition(
                          opacity: animation,
                          child: SlideTransition(
                            position: Tween<Offset>(
                              begin: const Offset(0.04, 0),
                              end: Offset.zero,
                            ).animate(animation),
                            child: child,
                          ),
                        );
                      },
                      child: _currentStep == AuthStep.phone
                          ? AuthPhoneStepWidget(
                              key: const ValueKey('phone_step'),
                              initialRole: _activeRole,
                              onRoleChanged: (role) =>
                                  setState(() => _activeRole = role),
                              onOtpRequested: _onOtpRequested,
                            )
                          : AuthOtpStepWidget(
                              key: const ValueKey('otp_step'),
                              phone: _targetPhone,
                              role: _activeRole,
                              isRegister: _isRegister,
                              onBackToPhone: () => setState(
                                () => _currentStep = AuthStep.phone,
                              ),
                              onVerificationSuccess: _onVerificationSuccess,
                            ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // ── B2B Network Footer Badge ───────────────────────────────
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.md,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceDark.withAlpha(160),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: AppColors.borderDark.withAlpha(120),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.shield_outlined,
                          size: 14,
                          color: AppColors.accentGreen,
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          'AdhocX B2B Network · Enterprise Mobility Security',
                          style: AppTypography.caption(
                            color: AppColors.textSecondaryDark,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}