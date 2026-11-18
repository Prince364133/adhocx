import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Boarding OTP Input backed by live nextTrip / tracking boardingOtp.
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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadOtp());
  }

  Future<void> _loadOtp() async {
    final snapshot = await loadLiveTripSnapshot(context);
    final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
    final tracking =
        (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
    if (mounted) {
      setState(() {
        _expectedOtp = tracking['boardingOtp']?.toString() ??
            next['boardingOtp']?.toString();
        _dwellRemainingSeconds = tracking['dwellRemainingSeconds'] is num
            ? (tracking['dwellRemainingSeconds'] as num).toInt()
            : null;
        _loading = false;
      });
    }
  }

  void _verify() {
    if (_code.length != 6) return;
    final expected = _expectedOtp;
    final ok = expected == null || expected.isEmpty || _code == expected;
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
      return const EmployeeLoadingScaffold(appBar: EmployeeAppBar());
    }
    final p = EmployeePalette.of(context);

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
                      'Enter the 6-digit boarding OTP for your assigned cab.',
                      textAlign: TextAlign.center,
                      style: AppTypography.body(color: p.textSecondary),
                    ),
                    const SizedBox(height: AppSpacing.xxxl + 4),
                    EmployeeOtpInput(
                      onChanged: (value) => setState(() => _code = value),
                      onCompleted: (value) {
                        _code = value;
                        _verify();
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
                          "Need to refresh OTP?",
                          style: AppTypography.small(color: p.textMuted),
                        ),
                        TextButton(
                          onPressed: () async {
                            await _loadOtp();
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Refreshed active boarding OTP.'),
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
                onPressed: _code.length == 6 ? _verify : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
