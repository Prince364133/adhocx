import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';

/// Boarding Pass / QR screen backed by live tracking dynamicQrToken & boardingOtp.
class ScanBoardingQrScreen extends StatefulWidget {
  const ScanBoardingQrScreen({super.key});

  @override
  State<ScanBoardingQrScreen> createState() => _ScanBoardingQrScreenState();
}

class _ScanBoardingQrScreenState extends State<ScanBoardingQrScreen> {
  bool _refreshing = false;
  String? _qrToken;
  String? _boardingOtp;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadPass());
  }

  Future<void> _loadPass({bool force = false}) async {
    if (force && mounted) setState(() => _refreshing = true);
    try {
      final snapshot = await loadLiveTripSnapshot(context, force: force);
      final tracking =
          (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
      final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
      final rawToken = tracking['dynamicQrToken']?.toString().trim();
      final rawOtp = tracking['boardingOtp']?.toString().trim() ??
          next['boardingOtp']?.toString().trim();
      if (mounted) {
        setState(() {
          _qrToken = (rawToken != null && rawToken.isNotEmpty) ? rawToken : null;
          _boardingOtp = (rawOtp != null && rawOtp.isNotEmpty) ? rawOtp : null;
        });
      }
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: const EmployeeAppBar(
        title: 'Boarding QR Pass',
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(),
            Semantics(
              button: true,
              label: 'Verify boarding pass',
              child: GestureDetector(
                onTap: () => context.push(AppRoutes.verifyingBoarding),
                child: Column(
                  children: [
                    const BoardingQrFrame(),
                    const SizedBox(height: AppSpacing.xl),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.pageHorizontal,
                      ),
                      child: Text(
                        _qrToken != null
                            ? 'Dynamic boarding pass active — show this pass or OTP to your driver'
                            : 'Boarding pass will activate once your cab is dispatched',
                        textAlign: TextAlign.center,
                        style: AppTypography.small(
                          color: Colors.white.withAlpha(179),
                        ),
                      ),
                    ),
                    if (_qrToken != null) ...[
                      const SizedBox(height: AppSpacing.md),
                      Container(
                        margin: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.pageHorizontal,
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.lg,
                          vertical: AppSpacing.xs + 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(20),
                          borderRadius: AppRadius.borderMd,
                          border: Border.all(color: Colors.white.withAlpha(50)),
                        ),
                        child: Text(
                          'Pass Token: $_qrToken',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.caption(
                            color: Colors.white.withAlpha(220),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                    if (_boardingOtp != null) ...[
                      const SizedBox(height: AppSpacing.sm + 2),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.lg,
                          vertical: AppSpacing.xs + 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(26),
                          borderRadius: AppRadius.borderPill,
                        ),
                        child: Text(
                          'Boarding OTP: $_boardingOtp',
                          style: AppTypography.caption(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const Spacer(),
            Material(
              color: Colors.white.withAlpha(38),
              shape: StadiumBorder(
                side: BorderSide(color: Colors.white.withAlpha(77)),
              ),
              child: InkWell(
                customBorder: const StadiumBorder(),
                onTap: _refreshing ? null : () => _loadPass(force: true),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xl,
                    vertical: AppSpacing.md,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _refreshing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(
                              Icons.refresh_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        _refreshing ? 'Refreshing Pass…' : 'Refresh Pass',
                        style: AppTypography.small(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            TextButton(
              onPressed: () => context.push(AppRoutes.boardingOtpInput),
              child: Text(
                'Enter Boarding OTP Instead',
                style: AppTypography.small(
                  color: Colors.white.withAlpha(200),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      ),
    );
  }
}
