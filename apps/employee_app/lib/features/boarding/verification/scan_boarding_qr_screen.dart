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

/// Scan / Present Boarding QR backed by live tracking dynamicQrToken.
class ScanBoardingQrScreen extends StatefulWidget {
  const ScanBoardingQrScreen({super.key});

  @override
  State<ScanBoardingQrScreen> createState() => _ScanBoardingQrScreenState();
}

class _ScanBoardingQrScreenState extends State<ScanBoardingQrScreen> {
  bool _isFlashOn = false;
  String? _qrToken;
  String? _boardingOtp;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final snapshot = await loadLiveTripSnapshot(context);
      final tracking =
          (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
      final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
      if (mounted) {
        setState(() {
          _qrToken = tracking['dynamicQrToken']?.toString();
          _boardingOtp = tracking['boardingOtp']?.toString() ??
              next['boardingOtp']?.toString();
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: const EmployeeAppBar(
        title: 'Scan Boarding QR',
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(),
            Semantics(
              button: true,
              label: 'Verify boarding QR',
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
                        _qrToken != null && _qrToken!.isNotEmpty
                            ? 'Dynamic boarding pass active — show to driver or scan dashboard QR'
                            : 'Point camera at the QR code on the cab dashboard',
                        textAlign: TextAlign.center,
                        style: AppTypography.small(
                          color: Colors.white.withAlpha(179),
                        ),
                      ),
                    ),
                    if (_boardingOtp != null && _boardingOtp!.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.md),
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
                onTap: () {
                  setState(() => _isFlashOn = !_isFlashOn);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(_isFlashOn
                          ? 'Camera flash turned ON'
                          : 'Camera flash turned OFF'),
                    ),
                  );
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xl,
                    vertical: AppSpacing.md,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _isFlashOn
                            ? Icons.flash_on_rounded
                            : Icons.flash_off_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        _isFlashOn ? 'Turn Off Flash' : 'Turn On Flash',
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
            const SizedBox(height: AppSpacing.xxxl + 4),
          ],
        ),
      ),
    );
  }
}
