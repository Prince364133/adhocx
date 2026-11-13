import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Screen 2: Boarding OTP Input.
///
/// The employee types the 6-digit code shown by the driver with the phone's
/// native keyboard (previously the screen only *displayed* the mock code and
/// had no input at all). A matching code continues to verification; anything
/// else opens the Invalid OTP state.
class BoardingOtpInputScreen extends StatefulWidget {
  const BoardingOtpInputScreen({super.key});

  @override
  State<BoardingOtpInputScreen> createState() => _BoardingOtpInputScreenState();
}

class _BoardingOtpInputScreenState extends State<BoardingOtpInputScreen> {
  late final Future<Map<String, dynamic>?> _data =
      loadBoardingSection('verification_options');
  String _code = '';

  void _verify(String? expected) {
    if (_code.length != 6) return;
    final ok = expected == null || expected.isEmpty || _code == expected;
    context.push(ok ? AppRoutes.verifyingBoarding : AppRoutes.wrongOtp);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>?>(
      future: _data,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const EmployeeLoadingScaffold(appBar: EmployeeAppBar());
        }
        final p = EmployeePalette.of(context);
        final data = snapshot.data ?? const {};
        final expected = data['otp']?.toString();
        final expiresIn = data['otpExpiresIn'] ?? '02:58';

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(),
          resizeToAvoidBottomInset: true,
          body: SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xxl,
                      vertical: AppSpacing.lg,
                    ),
                    child: Column(
                      children: [
                        Text(
                          'Enter Boarding OTP',
                          style: AppTypography.h2(color: p.textPrimary),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'Enter the 6-digit OTP shown by your driver.',
                          textAlign: TextAlign.center,
                          style: AppTypography.body(color: p.textSecondary),
                        ),
                        const SizedBox(height: AppSpacing.xxxl + 4),
                        EmployeeOtpInput(
                          onChanged: (value) => setState(() => _code = value),
                          onCompleted: (value) {
                            _code = value;
                            _verify(expected);
                          },
                        ),
                        const SizedBox(height: AppSpacing.xxl),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.access_time_rounded,
                                size: 16, color: p.textMuted),
                            const SizedBox(width: AppSpacing.xs + 2),
                            Text(
                              'OTP expires in $expiresIn',
                              style: AppTypography.small(
                                color: p.accent,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Wrap(
                          alignment: WrapAlignment.center,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Text(
                              "Didn't receive OTP?",
                              style: AppTypography.small(color: p.textMuted),
                            ),
                            TextButton(
                              onPressed: () =>
                                  ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                      'A fresh boarding OTP has been generated.'),
                                ),
                              ),
                              child: Text(
                                'Resend',
                                style: AppTypography.label(
                                  color: p.accent,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.xxl,
                    AppSpacing.sm,
                    AppSpacing.xxl,
                    AppSpacing.lg,
                  ),
                  child: EmployeePrimaryButton(
                    label: 'Verify Boarding',
                    onPressed:
                        _code.length == 6 ? () => _verify(expected) : null,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
