import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/auth_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/widgets/employee_brand_logo.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  bool _animationStarted = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 720),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_animationStarted) return;
    _animationStarted = true;
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.value = 1;
    } else {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Animation<double> _entrance(double start, double end) {
    return CurvedAnimation(
      parent: _controller,
      curve: Interval(start, end, curve: Curves.easeOutCubic),
    );
  }

  Widget _animateIn(Animation<double> animation, Widget child) {
    return FadeTransition(
      opacity: animation,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0, 0.06),
          end: Offset.zero,
        ).animate(animation),
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Scaffold(
      backgroundColor: p.background,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.xl,
            ),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight - AppSpacing.xl * 2,
              ),
              child: IntrinsicHeight(
                child: Column(
                  children: [
                    const SizedBox(height: AppSpacing.md),
                    _animateIn(
                      _entrance(0, 0.55),
                      const EmployeeBrandLogo(fontSize: 32),
                    ),
                    const Spacer(),
                    _animateIn(
                      _entrance(0.08, 0.72),
                      const WelcomeIllustration(height: 220),
                    ),
                    const SizedBox(height: AppSpacing.xxxl + 4),
                    _animateIn(
                      _entrance(0.18, 0.82),
                      Text(
                        'Your Daily Office\nCommute, Simplified',
                        textAlign: TextAlign.center,
                        style: AppTypography.h1(
                          color: p.textPrimary,
                          overflow: null,
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md + 2),
                    _animateIn(
                      _entrance(0.26, 0.88),
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.lg,
                        ),
                        child: Text(
                          'Safe, reliable and organized transportation for your work journey.',
                          textAlign: TextAlign.center,
                          style: AppTypography.body(color: p.textSecondary),
                        ),
                      ),
                    ),
                    const Spacer(),
                    const SizedBox(height: AppSpacing.xxl),
                    _animateIn(
                      _entrance(0.34, 1),
                      EmployeePrimaryButton(
                        label: 'Get Started  →',
                        onPressed: () => context.push(AppRoutes.mobileNumber),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
