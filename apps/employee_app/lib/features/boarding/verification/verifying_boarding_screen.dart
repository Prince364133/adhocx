import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';

/// Screen 4: Verifying Boarding...
class VerifyingBoardingScreen extends StatefulWidget {
  const VerifyingBoardingScreen({super.key});

  @override
  State<VerifyingBoardingScreen> createState() =>
      _VerifyingBoardingScreenState();
}

class _VerifyingBoardingScreenState extends State<VerifyingBoardingScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(milliseconds: 1400), () {
      if (mounted) context.pushReplacement(AppRoutes.boardingSuccessful);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return const EmployeeCenteredLayout(
      illustration: VerifyingBoardingSpinner(),
      title: 'Verifying Boarding...',
      message: 'Please wait while we confirm your boarding.',
    );
  }
}
