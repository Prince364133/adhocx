import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../routes/app_routes.dart';
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
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  // TODO: Replace with Supabase Realtime channel for production
  // Channel: driver-approval-{profileId}
  // Listens for UPDATE on driver_profiles where id = profileId

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
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _reApply() {
    setState(() {
      _approvalState = _ApprovalState.waiting;
      _rejectionReason = null;
    });
    context.go(AppRoutes.kycUploadScreen);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
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
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          // Logo
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFF0d1117),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFF22c55e).withAlpha(77),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF22c55e).withAlpha(40),
                  blurRadius: 20,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Image.asset(
                'assets/images/adhocx_logo-1787692728598.png',
                width: 64,
                height: 64,
                fit: BoxFit.contain,
              ),
            ),
          ),
          const SizedBox(height: 32),
          // Pulsing clock icon
          AnimatedBuilder(
            animation: _pulseAnimation,
            builder: (context, child) {
              return Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: const Color(
                    0xFF22c55e,
                  ).withValues(alpha: 0.1 * _pulseAnimation.value),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: const Color(
                      0xFF22c55e,
                    ).withValues(alpha: 0.4 * _pulseAnimation.value),
                    width: 2,
                  ),
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    const Icon(
                      Icons.access_time_rounded,
                      color: Color(0xFF22c55e),
                      size: 40,
                    ),
                    Positioned(
                      top: 10,
                      right: 10,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: const Color(0xFF22c55e),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF22c55e).withAlpha(153),
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
          const SizedBox(height: 24),
          const Text(
            "You're on the Waitlist!",
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 10),
          const Text(
            'Your profile is currently under review by the AdhocX admin team.',
            style: TextStyle(color: Color(0xFF94a3b8), fontSize: 14),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          // Info box
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF22c55e).withAlpha(15),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF22c55e).withAlpha(60)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _infoRow(
                  Icons.admin_panel_settings_outlined,
                  'Under Review by Admin',
                ),
                const SizedBox(height: 8),
                _infoRow(
                  Icons.schedule_outlined,
                  'Typical review time: 30 minutes – 24 hours',
                ),
                const SizedBox(height: 8),
                _infoRow(
                  Icons.autorenew_rounded,
                  'You will be automatically redirected once approved — no refresh needed',
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          const WaitlistStepsWidget(),
        ],
      ),
    );
  }

  Widget _buildApprovedState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: const Color(0xFF22c55e).withAlpha(38),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_circle_rounded,
              color: Color(0xFF22c55e),
              size: 48,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            "You're Approved!",
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Redirecting to your driver console...',
            style: TextStyle(color: Color(0xFF94a3b8), fontSize: 14),
          ),
          const SizedBox(height: 24),
          const CircularProgressIndicator(
            color: Color(0xFF22c55e),
            strokeWidth: 2,
          ),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: const Color(0xFF22c55e), size: 16),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(color: Color(0xFF22c55e), fontSize: 12),
          ),
        ),
      ],
    );
  }
}