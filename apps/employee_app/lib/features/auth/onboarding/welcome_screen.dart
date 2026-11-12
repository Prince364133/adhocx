import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/employee_brand_logo.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/widgets/illustration_widgets.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

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
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact = constraints.maxHeight < 700;
            final illustrationHeight =
                constraints.maxHeight < 620 ? 144.0 : 184.0;
            return SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: IntrinsicHeight(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 480),
                      child: Padding(
                        padding: EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: compact ? 12 : 20,
                        ),
                        child: Column(
                          children: [
                            const SizedBox(height: 12),
                            _animateIn(
                              _entrance(0, 0.55),
                              const EmployeeBrandLogo(
                                fontSize: 30,
                                logoTheme: LogoTheme.light,
                              ),
                            ),
                            SizedBox(height: compact ? 24 : 36),
                            _animateIn(
                              _entrance(0.08, 0.72),
                              WelcomeIllustration(height: illustrationHeight),
                            ),
                            SizedBox(height: compact ? 24 : 32),
                            _animateIn(
                              _entrance(0.18, 0.82),
                              Text(
                                'Your Daily Office\nCommute, Simplified',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.inter(
                                  fontSize: compact ? 24 : 26,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                  height: 1.25,
                                  letterSpacing: -0.5,
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            _animateIn(
                              _entrance(0.26, 0.88),
                              Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 16),
                                child: Text(
                                  'Safe, reliable and organized transportation for your work journey.',
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w400,
                                    color: AppColors.textSecondary,
                                    height: 1.5,
                                  ),
                                ),
                              ),
                            ),
                            const Spacer(),
                            _animateIn(
                              _entrance(0.34, 1),
                              EmployeePrimaryButton(
                                label: 'Get Started  →',
                                onPressed: () =>
                                    context.push(AppRoutes.mobileNumber),
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
