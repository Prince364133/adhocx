import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';

/// Screen 3: Scan QR for Boarding.
///
/// Camera viewfinder surface: intentionally pure black (Driver `bgDark`) with
/// white controls in both light and dark mode.
class ScanBoardingQrScreen extends StatefulWidget {
  const ScanBoardingQrScreen({super.key});

  @override
  State<ScanBoardingQrScreen> createState() => _ScanBoardingQrScreenState();
}

class _ScanBoardingQrScreenState extends State<ScanBoardingQrScreen> {
  bool _isFlashOn = false;

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
              label: 'Simulate QR scan',
              child: GestureDetector(
                onTap: () => context.push(AppRoutes.verifyingBoarding),
                child: Column(
                  children: [
                    const BoardingQrFrame(),
                    const SizedBox(height: AppSpacing.xl),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.xxl,
                      ),
                      child: Text(
                        'Point camera at the QR code on the cab dashboard',
                        textAlign: TextAlign.center,
                        style: AppTypography.small(
                          color: Colors.white.withAlpha(179),
                        ),
                      ),
                    ),
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
