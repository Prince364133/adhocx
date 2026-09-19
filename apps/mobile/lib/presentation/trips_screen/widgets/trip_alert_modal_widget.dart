import '../../../shared/theme/app_colors.dart';
import 'dart:async';
import 'package:flutter/material.dart';

class TripAlertModalWidget extends StatefulWidget {
  final Map<String, dynamic> trip;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  const TripAlertModalWidget({
    super.key,
    required this.trip,
    required this.onAccept,
    required this.onDecline,
  });

  @override
  State<TripAlertModalWidget> createState() => _TripAlertModalWidgetState();
}

class _TripAlertModalWidgetState extends State<TripAlertModalWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _slideController;
  late Animation<Offset> _slideAnim;
  late Timer _countdownTimer;
  int _secondsLeft = 30;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 350),
      vsync: this,
    );
    _slideAnim = Tween<Offset>(begin: const Offset(0, 1), end: Offset.zero)
        .animate(
          CurvedAnimation(parent: _slideController, curve: Curves.easeOutCubic),
        );
    _slideController.forward();

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeft <= 1) {
        timer.cancel();
        widget.onDecline(); // auto-decline on timeout
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  @override
  void dispose() {
    _slideController.dispose();
    _countdownTimer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _secondsLeft / 30.0;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: SlideTransition(
        position: _slideAnim,
        child: Container(
          decoration: BoxDecoration(
            color: (isDark ? AppColors.bgDark : AppColors.bgLight).withAlpha(250),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Progress bar
              LinearProgressIndicator(
                value: progress,
                backgroundColor: isDark ? AppColors.borderDark : AppColors.borderLight,
                valueColor: const AlwaysStoppedAnimation<Color>(
                  AppColors.warning,
                ),
                minHeight: 3,
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppColors.warning.withAlpha(128),
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.warning.withAlpha(26),
                        blurRadius: 20,
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              _pulsingDot(),
                              const SizedBox(width: 8),
                              Text(
                                'New Trip Alert!',
                                style: TextStyle(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.warning.withAlpha(38),
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(
                                color: AppColors.warning.withAlpha(102),
                              ),
                            ),
                            child: Text(
                              '${_secondsLeft}s',
                              style: const TextStyle(
                                color: AppColors.warning,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Pickup
                      _addressRow(
                        isDark: isDark,
                        icon: Icons.navigation_rounded,
                        iconColor: AppColors.success,
                        label: 'Pickup',
                        address: widget.trip['pickup'] as String,
                      ),
                      const SizedBox(height: 10),
                      // Drop
                      _addressRow(
                        isDark: isDark,
                        icon: Icons.location_pin,
                        iconColor: AppColors.error,
                        label: 'Drop',
                        address: widget.trip['drop'] as String,
                      ),
                      const SizedBox(height: 16),
                      // 3-column grid
                      Row(
                        children: [
                          _infoBox(
                            isDark: isDark,
                            label: 'Distance',
                            value: widget.trip['distance'] as String,
                            icon: Icons.straighten_rounded,
                          ),
                          const SizedBox(width: 8),
                          _infoBox(
                            isDark: isDark,
                            label: 'Vehicle',
                            value: widget.trip['vehicle_type'] as String,
                            icon: Icons.directions_car_rounded,
                          ),
                          const SizedBox(width: 8),
                          _infoBox(
                            isDark: isDark,
                            label: 'Payout',
                            value: '₹${widget.trip['payout']}',
                            icon: Icons.currency_rupee_rounded,
                            valueColor: AppColors.success,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Buttons
                      Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: widget.onDecline,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 13,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.transparent,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                  ),
                                ),
                                child: Text(
                                  'Decline',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: GestureDetector(
                              onTap: widget.onAccept,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 13,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.success,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Text(
                                  'Accept Trip',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _pulsingDot() {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.4, end: 1.0),
      duration: const Duration(milliseconds: 800),
      builder: (context, value, child) {
        return Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: AppColors.warning.withValues(alpha: value),
            shape: BoxShape.circle,
          ),
        );
      },
    );
  }

  Widget _addressRow({
    required bool isDark,
    required IconData icon,
    required Color iconColor,
    required String label,
    required String address,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: iconColor, size: 16),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  fontSize: 10,
                ),
              ),
              Text(
                address,
                style: TextStyle(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _infoBox({
    required bool isDark,
    required String label,
    required String value,
    required IconData icon,
    Color? valueColor,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              size: 14,
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                color: valueColor ?? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            Text(
              label,
              style: TextStyle(
                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
