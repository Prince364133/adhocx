import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/utils/app_logger.dart';
import '../../core/utils/app_toast.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/adhocx_brand_logo.dart';
import './widgets/waitlist_rejected_widget.dart';
import './widgets/waitlist_steps_widget.dart';

enum _ApprovalState { waiting, approved, rejected }

class WaitlistGateScreen extends StatefulWidget {
  const WaitlistGateScreen({super.key});

  @override
  State<WaitlistGateScreen> createState() => _WaitlistGateScreenState();
}

class _WaitlistGateScreenState extends State<WaitlistGateScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  _ApprovalState _approvalState = _ApprovalState.waiting;
  String? _rejectionReason;
  Timer? _statusPoller;
  bool _isChecking = false;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _checkInitialStatus();
    _startStatusPolling();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _approvalState == _ApprovalState.waiting) {
      _pollStatusOnce();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _statusPoller?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  void _checkInitialStatus() {
    final user = AuthService.instance.currentUser;
    if (user != null) {
      if (user.isVerified) {
        _handleApproved();
      } else if (user.isRejected) {
        setState(() {
          _approvalState = _ApprovalState.rejected;
          _rejectionReason = user.rejectionReason ?? 'Application requires clarification.';
        });
      } else {
        setState(() {
          _approvalState = _ApprovalState.waiting;
          _rejectionReason = null;
        });
      }
    }
  }

  void _startStatusPolling() {
    _statusPoller = Timer.periodic(const Duration(seconds: 3), (_) async {
      await _pollStatusOnce();
    });
  }

  Future<void> _pollStatusOnce() async {
    try {
      final user = await AuthService.instance.fetchCurrentUser(forceRefresh: true);
      if (!mounted || user == null) return;

      context.read<AuthProvider>().setUser(user);

      bool isDriverApproved = false;
      if (user.isDriver) {
        try {
          final profile = await DriverService.instance.getProfile(forceRefresh: true);
          if (profile is Map && profile['verificationStatus'] == 'VERIFIED') {
            isDriverApproved = true;
          }
        } catch (_) {}
      }

      final isApproved = user.isVerified || isDriverApproved;

      if (isApproved && _approvalState != _ApprovalState.approved) {
        _handleApproved();
      } else if (user.isRejected && _approvalState != _ApprovalState.rejected) {
        setState(() {
          _approvalState = _ApprovalState.rejected;
          _rejectionReason = user.rejectionReason ?? 'Your submitted documents require updates.';
        });
      } else if (!user.isRejected && !isApproved && _approvalState != _ApprovalState.waiting) {
        setState(() {
          _approvalState = _ApprovalState.waiting;
          _rejectionReason = null;
        });
      }
    } catch (_) {}
  }

  void _handleApproved() {
    setState(() {
      _approvalState = _ApprovalState.approved;
    });

    _statusPoller?.cancel();

    Future.delayed(const Duration(milliseconds: 1600), () {
      if (mounted) {
        final user = AuthService.instance.currentUser;
        if (user != null && user.isUser) {
          context.go(AppRoutes.userHomeScreen);
        } else {
          context.go(AppRoutes.homeScreen);
        }
      }
    });
  }

  Future<void> _manualCheck() async {
    if (_isChecking) return;
    setState(() => _isChecking = true);

    try {
      final user = await AuthService.instance.fetchCurrentUser(forceRefresh: true);
      if (!mounted) return;

      if (user != null) {
        context.read<AuthProvider>().setUser(user);

        bool isDriverApproved = false;
        if (user.isDriver) {
          try {
            final profile = await DriverService.instance.getProfile(forceRefresh: true);
            if (profile is Map && profile['verificationStatus'] == 'VERIFIED') {
              isDriverApproved = true;
            }
          } catch (_) {}
        }

        final isApproved = user.isVerified || isDriverApproved;

        if (isApproved) {
          if (mounted) {
            AppToast.showSuccess('Your account is approved! Redirecting...', context: context);
          }
          _handleApproved();
          return;
        } else if (user.isRejected) {
          setState(() {
            _approvalState = _ApprovalState.rejected;
            _rejectionReason = user.rejectionReason ?? 'Your submitted documents require updates.';
          });
          return;
        }
      }

      setState(() {
        _approvalState = _ApprovalState.waiting;
        _rejectionReason = null;
      });

      if (mounted) {
        final isBusiness = user != null && user.isUser;
        AppToast.showInfo(
          isBusiness
              ? 'Verification is in progress. We\'ll update automatically!'
              : 'Review is in progress. Your documents are being verified!',
          context: context,
        );
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError('Could not refresh status. Please check your connection.', context: context);
      }
    } finally {
      if (mounted) {
        setState(() => _isChecking = false);
      }
    }
  }

  void _reApply() {
    setState(() {
      _approvalState = _ApprovalState.waiting;
      _rejectionReason = null;
    });
    final user = AuthService.instance.currentUser;
    if (user != null) {
      try {
        final onboarding = context.read<OnboardingProvider>();
        onboarding.setRole(user.role);
        if (user.fullName != null || user.phone != null || user.email != null) {
          onboarding.setPersonalDetails(
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
          );
        }
      } catch (_) {}
    }
    if (user != null && user.isUser) {
      context.go(AppRoutes.onboardingPersonalScreen);
    } else {
      context.go(AppRoutes.onboardingDocumentsScreen);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: switch (_approvalState) {
          _ApprovalState.approved => _buildApprovedState(isDark),
          _ApprovalState.rejected => WaitlistRejectedWidget(
              reason: _rejectionReason ?? 'Your application requires updates.',
              onReApply: _reApply,
            ),
          _ApprovalState.waiting => _buildWaitingState(isDark),
        },
      ),
    );
  }

  Widget _buildWaitingState(bool isDark) {
    final user = AuthService.instance.currentUser;
    final isBusiness = user != null && user.isUser;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.lg),
      child: Column(
        children: [
          const SizedBox(height: AppSpacing.md),

          // Synchronized Brand Identity Header
          _buildBrandHeader(isDark),

          const SizedBox(height: AppSpacing.xxl),

          // Animated Hero Review Status Card
          _buildHeroReviewCard(isDark, isBusiness),

          const SizedBox(height: AppSpacing.xl),

          // Steps Progress
          WaitlistStepsWidget(isBusiness: isBusiness),

          const SizedBox(height: AppSpacing.xl),

          // Live Sync & Checklist Details
          _buildLiveSyncCard(isDark, isBusiness),

          const SizedBox(height: AppSpacing.xxl),

          // Action Buttons
          _buildActionButtons(isDark),

          const SizedBox(height: AppSpacing.lg),
        ],
      ),
    );
  }

  Widget _buildBrandHeader(bool isDark) {
    return Column(
      children: [
        // App Icon Badge
        Container(
          width: 58,
          height: 58,
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.15),
                blurRadius: 18,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.lg - 1.5),
            child: Padding(
              padding: const EdgeInsets.all(8.0),
              child: Image.asset(
                'assets/images/adhocx_icon.png',
                fit: BoxFit.contain,
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),

        // Synchronized AdhocX Brand Typography
        AdhocxBrandLogo(
          fontSize: 28,
          subtitle: 'VERIFICATION CENTER',
          isDark: isDark,
        ),
      ],
    );
  }

  Widget _buildHeroReviewCard(bool isDark, bool isBusiness) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Live Pulse Status Pill
          AnimatedBuilder(
            animation: _pulseAnimation,
            builder: (context, child) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.brandOrange.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.full),
                  border: Border.all(
                    color: AppColors.brandOrange.withValues(alpha: 0.45 * _pulseAnimation.value),
                    width: 1.5,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: AppColors.brandOrange,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.brandOrange.withValues(alpha: 0.8 * _pulseAnimation.value),
                            blurRadius: 6,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'REVIEW IN PROGRESS',
                      style: AppTypography.caption(
                        color: AppColors.brandOrange,
                        fontWeight: FontWeight.w800,
                      ).copyWith(letterSpacing: 1.2),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: AppSpacing.lg),

          // Central Animated Pulse Icon
          AnimatedBuilder(
            animation: _pulseAnimation,
            builder: (context, child) {
              return Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08 * _pulseAnimation.value),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.45 * _pulseAnimation.value),
                    width: 2,
                  ),
                ),
                child: Center(
                  child: Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.14),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.hourglass_top_rounded,
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      size: 30,
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: AppSpacing.lg),

          // Heading
          Text(
            isBusiness ? 'Verification Under Review' : 'Review in Progress',
            style: AppTypography.h1(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            ).copyWith(fontWeight: FontWeight.w800),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.sm),

          // Subtitle
          Text(
            isBusiness
                ? 'Your company profile has been submitted. Our compliance team is verifying your registration to activate trip posting.'
                : 'Your profile and KYC documents are currently under review by the AdhocX Verification Team. No action needed.',
            style: AppTypography.body(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ).copyWith(height: 1.4),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildLiveSyncCard(bool isDark, bool isBusiness) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Live Sync Header Row
          Row(
            children: [
              AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  return Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: AppColors.success,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.success.withValues(alpha: 0.7 * _pulseAnimation.value),
                          blurRadius: 6,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'Live Auto-Sync Active',
                style: AppTypography.label(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  'Every 3s',
                  style: TextStyle(
                    color: AppColors.success,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'This screen automatically unlocks and routes to your console the moment you are approved.',
            style: AppTypography.caption(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          const Divider(height: 1),
          const SizedBox(height: AppSpacing.md),

          // Breakdown items
          _checklistItem(
            isDark: isDark,
            icon: Icons.check_circle_rounded,
            iconColor: AppColors.success,
            title: isBusiness ? 'Company Profile' : 'KYC & Driver Documents',
            subtitle: 'Submitted successfully',
            trailingBadge: 'DONE',
            trailingColor: AppColors.success,
          ),
          const SizedBox(height: AppSpacing.sm),
          _checklistItem(
            isDark: isDark,
            icon: Icons.sync_rounded,
            iconColor: AppColors.brandOrange,
            title: 'Compliance & Safety Audit',
            subtitle: 'Verification Officer reviewing documents',
            trailingBadge: 'IN PROGRESS',
            trailingColor: AppColors.brandOrange,
          ),
          const SizedBox(height: AppSpacing.sm),
          _checklistItem(
            isDark: isDark,
            icon: Icons.lock_clock_rounded,
            iconColor: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            title: 'Account Activation',
            subtitle: isBusiness ? 'Access trip dispatch' : 'Go online and accept trips',
            trailingBadge: 'NEXT',
            trailingColor: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
          ),
        ],
      ),
    );
  }

  Widget _checklistItem({
    required bool isDark,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required String trailingBadge,
    required Color trailingColor,
  }) {
    return Row(
      children: [
        Icon(icon, color: iconColor, size: 20),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTypography.bodyMedium(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                subtitle,
                style: AppTypography.caption(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
          decoration: BoxDecoration(
            color: trailingColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(AppRadius.xs),
          ),
          child: Text(
            trailingBadge,
            style: TextStyle(
              color: trailingColor,
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(bool isDark) {
    return Row(
      children: [
        Expanded(
          flex: 3,
          child: ElevatedButton.icon(
            onPressed: _isChecking ? null : _manualCheck,
            icon: _isChecking
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.refresh_rounded, size: 18),
            label: Text(
              _isChecking ? 'Checking...' : 'Check Status',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              elevation: 0,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          flex: 2,
          child: OutlinedButton.icon(
            onPressed: () async {
              final authProvider = context.read<AuthProvider>();
              final onboardingProvider = context.read<OnboardingProvider>();
              final router = GoRouter.of(context);
              try {
                AppLogger.info('User sign out from review gate', tag: 'AUTH');
                await authProvider.logout();
                onboardingProvider.reset();
              } catch (e) {
                AppLogger.error('Error during sign out: $e', tag: 'AUTH', error: e);
              }
              if (mounted) {
                router.go(AppRoutes.signInScreen);
              }
            },
            icon: const Icon(Icons.logout_rounded, size: 18, color: Colors.redAccent),
            label: const Text('Sign Out', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w600)),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: Colors.redAccent.withValues(alpha: 0.4)),
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildApprovedState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.16),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.success, width: 2.5),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.success.withValues(alpha: 0.35),
                    blurRadius: 24,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                color: AppColors.success,
                size: 58,
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            Text(
              "You're Approved!",
              style: AppTypography.display(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Your profile and documents have been verified. Welcome to AdhocX!',
              style: AppTypography.body(
                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xxl),
            const CircularProgressIndicator(
              color: AppColors.primary,
              strokeWidth: 3,
            ),
          ],
        ),
      ),
    );
  }
}