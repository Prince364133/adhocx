import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Boarding OTP Input backed by live nextTrip / tracking boardingOtp (4-digit backend default).
class BoardingOtpInputScreen extends StatefulWidget {
  const BoardingOtpInputScreen({super.key});

  @override
  State<BoardingOtpInputScreen> createState() => _BoardingOtpInputScreenState();
}

class _BoardingOtpInputScreenState extends State<BoardingOtpInputScreen> {
  String _code = '';
  String? _expectedOtp;
  int? _dwellRemainingSeconds;
  bool _loading = true;
  bool _hasError = false;
  String? _errorMessage;

  int get _otpLength {
    final exp = _expectedOtp?.trim();
    if (exp != null && exp.length >= 4 && exp.length <= 8) {
      return exp.length;
    }
    return 4;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadOtp());
  }

  Future<void> _loadOtp({bool force = false}) async {
    final snapshot = await loadLiveTripSnapshot(context, force: force);
    final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
    final tracking =
        (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
    final rawOtp = tracking['boardingOtp']?.toString().trim() ??
        next['boardingOtp']?.toString().trim();
    if (mounted) {
      setState(() {
        _expectedOtp = (rawOtp != null && rawOtp.isNotEmpty) ? rawOtp : null;
        _dwellRemainingSeconds = tracking['dwellRemainingSeconds'] is num
            ? (tracking['dwellRemainingSeconds'] as num).toInt()
            : null;
        _hasError = false;
        _errorMessage = null;
        _loading = false;
      });
    }
  }

  void _verify() {
    if (_code.length != _otpLength) return;
    final expected = _expectedOtp?.trim();
    if (expected == null || expected.isEmpty) {
      setState(() {
        _hasError = true;
        _errorMessage =
            'No active boarding OTP is available for this trip. Tap Refresh or check with your driver.';
      });
      return;
    }
    final ok = _code == expected;
    if (!ok) {
      setState(() {
        _hasError = true;
        _errorMessage = 'Incorrect boarding OTP.';
      });
    }
    context.push(ok ? AppRoutes.verifyingBoarding : AppRoutes.wrongOtp);
  }

  String get _dwellText {
    final secs = _dwellRemainingSeconds;
    if (secs == null || secs <= 0) return 'Active for current stop';
    final mins = (secs ~/ 60).toString().padLeft(2, '0');
    final rem = (secs % 60).toString().padLeft(2, '0');
    return 'OTP valid for $mins:$rem';
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const EmployeeLoadingScaffold(
        appBar: EmployeeAppBar(),
        skeletonLayout: SkeletonLayout.form,
      );
    }
    final p = EmployeePalette.of(context);
    final otpLength = _otpLength;

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
                  horizontal: AppSpacing.pageHorizontal,
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
                      'Enter the $otpLength-digit boarding OTP for your assigned cab.',
                      textAlign: TextAlign.center,
                      style: AppTypography.body(color: p.textSecondary),
                    ),
                    const SizedBox(height: AppSpacing.xxxl + 4),
                    EmployeeOtpInput(
                      key: ValueKey('boarding-otp-$otpLength'),
                      length: otpLength,
                      hasError: _hasError,
                      onChanged: (value) => setState(() {
                        _code = value;
                        if (_hasError) {
                          _hasError = false;
                          _errorMessage = null;
                        }
                      }),
                      onCompleted: (value) {
                        _code = value;
                        _verify();
                      },
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        _errorMessage!,
                        textAlign: TextAlign.center,
                        style: AppTypography.small(
                          color: AppColors.error,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                    const SizedBox(height: AppSpacing.xxl),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.access_time_rounded,
                            size: 16, color: p.textMuted),
                        const SizedBox(width: AppSpacing.xs + 2),
                        Text(
                          _dwellText,
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
                          'Need to refresh OTP?',
                          style: AppTypography.small(color: p.textMuted),
                        ),
                        TextButton(
                          onPressed: () async {
                            await _loadOtp(force: true);
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  _expectedOtp != null
                                      ? 'Refreshed active boarding OTP.'
                                      : 'No active boarding OTP returned yet.',
                                ),
                              ),
                            );
                          },
                          child: Text(
                            'Refresh',
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
                AppSpacing.pageHorizontal,
                AppSpacing.sm,
                AppSpacing.pageHorizontal,
                AppSpacing.lg,
              ),
              child: EmployeePrimaryButton(
                label: 'Verify Boarding',
                onPressed: _code.length == otpLength ? _verify : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
