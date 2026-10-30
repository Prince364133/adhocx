import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/animations/app_animations.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserRequirementPostedConfirmationScreen extends StatefulWidget {
  final Map<String, dynamic>? requirement;

  const UserRequirementPostedConfirmationScreen({
    super.key,
    this.requirement,
  });

  @override
  State<UserRequirementPostedConfirmationScreen> createState() =>
      _UserRequirementPostedConfirmationScreenState();
}

class _UserRequirementPostedConfirmationScreenState
    extends State<UserRequirementPostedConfirmationScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _checkScaleAnimation;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );

    _checkScaleAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.2, end: 1.2), weight: 60),
      TweenSequenceItem(tween: Tween(begin: 1.2, end: 1.0), weight: 40),
    ]).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.0, 0.6, curve: AppCurves.spring),
      ),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: const Interval(0.3, 1.0, curve: Curves.easeIn),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.3, 1.0, curve: AppCurves.smoothOut),
      ),
    );

    _animController.forward();
    HapticFeedback.mediumImpact();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final req = widget.requirement;
    final rawId = req?['id'] as String? ?? 'REQ-LIVE';
    final displayId = rawId.length > 8 ? 'REQ-${rawId.substring(0, 8).toUpperCase()}' : rawId;
    final qty = (req?['quantity'] ?? req?['requiredQuantity'] ?? 1).toString();
    final vehicle = req?['vehicleType'] as String? ?? 'Sedan';
    final mode = req?['fulfillmentMode'] == 'BIDDING' ? 'Reverse Auction' : 'Direct Dispatch';

    final pickup = req?['pickupLocation']?['address'] as String? ?? req?['pickupAddress'] as String? ?? 'Pickup Location';
    final drop = req?['dropLocation']?['address'] as String? ?? req?['dropAddress'] as String? ?? 'Destination';
    final pickupShort = pickup.split(',').first.trim();
    final dropShort = drop.split(',').first.trim();

    final reportingTimeStr = req?['reportingTime'] as String?;
    final DateTime? reportingTime = reportingTimeStr != null ? DateTime.tryParse(reportingTimeStr)?.toLocal() : null;
    final formattedTime = reportingTime != null
        ? '${reportingTime.day} ${_getMonth(reportingTime.month)} ${reportingTime.year} • ${_formatTime(reportingTime)}'
        : 'Immediate Dispatch';

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // Bouncing Green Check Icon with Radiating Glow
              ScaleTransition(
                scale: _checkScaleAnimation,
                child: Container(
                  width: 104,
                  height: 104,
                  decoration: BoxDecoration(
                    color: AppColors.success.withAlpha(35),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.success.withAlpha(60),
                        blurRadius: 28,
                        spreadRadius: 6,
                      ),
                    ],
                  ),
                  child: Center(
                    child: Container(
                      width: 76,
                      height: 76,
                      decoration: const BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check, size: 48, color: Colors.white),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              // Title and Subtitle with Fade & Slide
              FadeTransition(
                opacity: _fadeAnimation,
                child: SlideTransition(
                  position: _slideAnimation,
                  child: Column(
                    children: [
                      Text(
                        'Requirement Posted!',
                        style: AppTypography.h1(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Your requirement has been saved and broadcasted to verified drivers.',
                        textAlign: TextAlign.center,
                        style: AppTypography.body(
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // Requirement Summary Card
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(20),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Requirement ID',
                                  style: AppTypography.caption(
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                ),
                                Text(
                                  displayId,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 16),
                            Text(
                              '$qty Vehicles • $vehicle • $mode',
                              style: AppTypography.h4(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.location_on_outlined, size: 16, color: AppColors.primary),
                                const SizedBox(width: 4),
                                Flexible(
                                  child: Text(
                                    pickupShort,
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Icon(Icons.arrow_forward, size: 14, color: AppColors.slate400),
                                const SizedBox(width: 6),
                                const Icon(Icons.pin_drop_outlined, size: 16, color: AppColors.accentPurple),
                                const SizedBox(width: 4),
                                Flexible(
                                  child: Text(
                                    dropShort,
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              formattedTime,
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const Spacer(),

              // Actions: View Requirement + Back to Home
              FadeTransition(
                opacity: _fadeAnimation,
                child: Column(
                  children: [
                    AppPrimaryButton(
                      text: 'View Requirement Status →',
                      onPressed: () {
                        context.push(
                          AppRoutes.userRequirementDetailsScreen,
                          extra: req ?? {'id': rawId},
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.md),
                    OutlinedButton(
                      onPressed: () => context.go(AppRoutes.userHomeScreen),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                      child: const Text('Back to Home', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.md),
            ],
          ),
        ),
      ),
    );
  }

  static String _getMonth(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (month >= 1 && month <= 12) ? months[month - 1] : 'May';
  }

  static String _formatTime(DateTime dt) {
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final minute = dt.minute.toString().padLeft(2, '0');
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $ampm';
  }
}
