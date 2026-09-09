import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import './widgets/waitlist_rejected_widget.dart';
import './widgets/waitlist_steps_widget.dart';

enum _ApprovalState { waiting, approved, rejected }

class WaitlistGateScreen extends StatefulWidget {
  const WaitlistGateScreen({super.key});

  @override
  State<WaitlistGateScreen> createState() => _WaitlistGateScreenState();
}

class _WaitlistGateScreenState extends State<WaitlistGateScreen>
    with SingleTickerProviderStateMixin {
  _ApprovalState _approvalState = _ApprovalState.waiting;
  String? _rejectionReason;
  Timer? _statusPoller;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
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
  void dispose() {
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
      }
    }
  }

  void _startStatusPolling() {
    _statusPoller = Timer.periodic(const Duration(seconds: 4), (_) async {
      try {
        final user = await AuthService.instance.fetchCurrentUser();
        if (!mounted) return;

        if (user.isVerified && _approvalState != _ApprovalState.approved) {
          _handleApproved();
        } else if (user.isRejected && _approvalState != _ApprovalState.rejected) {
          setState(() {
            _approvalState = _ApprovalState.rejected;
            _rejectionReason = user.rejectionReason ?? 'Your submitted documents require updates.';
          });
        }
      } catch (_) {}
    });
  }

  void _handleApproved() {
    setState(() {
      _approvalState = _ApprovalState.approved;
    });

    _statusPoller?.cancel();

    Future.delayed(const Duration(milliseconds: 1800), () {
      if (mounted) {
        context.go(AppRoutes.tripsScreen);
      }
    });
  }

  void _reApply() {
    setState(() {
      _approvalState = _ApprovalState.waiting;
      _rejectionReason = null;
    });
    context.go(AppRoutes.onboardingDocumentsScreen);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      body: SafeArea(
        child: switch (_approvalState) {
          _ApprovalState.approved => _buildApprovedState(),
          _ApprovalState.rejected => WaitlistRejectedWidget(
            reason: _rejectionReason ?? 'Your application requires updates.',
            onReApply: _reApply,
          ),
          _ApprovalState.waiting => _buildWaitingState(),
        },
      ),
    );
  }

  Widget _buildWaitingState() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.xxl),
      child: Column(
        children: [
          const SizedBox(height: AppSpacing.xxxl),
          // Logo
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadius.lg),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.25),
                  blurRadius: 20,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.lg),
              child: Image.asset(
                'assets/images/adhocx_icon.png',
                fit: BoxFit.cover,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),

          // Pulsing Clock Icon with Brand Colors
          AnimatedBuilder(
            animation: _pulseAnimation,
            builder: (context, child) {
              return Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12 * _pulseAnimation.value),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.5 * _pulseAnimation.value),
                    width: 2,
                  ),
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Icon(
                      Icons.access_time_rounded,
                      color: AppColors.primaryLight,
                      size: 40,
                    ),
                    Positioned(
                      top: 12,
                      right: 12,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: AppColors.warning,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.warning.withValues(alpha: 0.6),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: AppSpacing.xl),

          Text(
            "You're on the Waitlist!",
            style: AppTypography.display(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Your profile and KYC documents are currently under review by the AdhocX Verification Center.',
            style: AppTypography.body(color: AppColors.textSecondaryDark),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xxl),

          // Info Box
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _infoRow(
                  Icons.admin_panel_settings_outlined,
                  'Under Review by Verification Officer',
                ),
                const SizedBox(height: AppSpacing.sm),
                _infoRow(
                  Icons.schedule_outlined,
                  'Typical review time: 15 minutes – 2 hours',
                ),
                const SizedBox(height: AppSpacing.sm),
                _infoRow(
                  Icons.autorenew_rounded,
                  'You will be automatically redirected upon approval — no refresh needed',
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxxl),
          const WaitlistStepsWidget(),
        ],
      ),
    );
  }

  Widget _buildApprovedState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.18),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.success, width: 2),
              ),
              child: Icon(
                Icons.check_circle_rounded,
                color: AppColors.success,
                size: 54,
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            Text(
              "You're Approved!",
              style: AppTypography.display(
                color: Colors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Your profile is verified. Redirecting to your console...',
              style: AppTypography.body(color: AppColors.textSecondaryDark),
            ),
            const SizedBox(height: AppSpacing.xxl),
            CircularProgressIndicator(
              color: AppColors.primary,
              strokeWidth: 2.5,
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: AppColors.primaryLight, size: 18),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            text,
            style: AppTypography.caption(
              color: AppColors.textPrimaryDark,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}