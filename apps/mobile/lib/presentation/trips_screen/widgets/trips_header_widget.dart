import '../../../shared/theme/app_colors.dart';
import 'dart:ui';
import 'package:flutter/material.dart';

class TripsHeaderWidget extends StatefulWidget {
  final bool isOnline;
  final bool hasActiveTrip;
  final String driverName;
  final String vehicleNumber;
  final String vehicleType;
  final VoidCallback onToggleOnline;

  const TripsHeaderWidget({
    super.key,
    required this.isOnline,
    required this.hasActiveTrip,
    required this.driverName,
    required this.vehicleNumber,
    required this.vehicleType,
    required this.onToggleOnline,
  });

  @override
  State<TripsHeaderWidget> createState() => _TripsHeaderWidgetState();
}

class _TripsHeaderWidgetState extends State<TripsHeaderWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.bgDark.withAlpha(230),
            border: const Border(
              bottom: BorderSide(color: AppColors.borderDark, width: 1),
            ),
          ),
          child: Row(
            children: [
              // Logo
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.bgDark,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: AppColors.success.withAlpha(77),
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(9),
                  child: Image.asset(
                    'assets/images/adhocx_icon.png',
                    width: 36,
                    height: 36,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // Driver info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          widget.driverName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.success.withAlpha(38),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(
                              color: AppColors.success.withAlpha(102),
                            ),
                          ),
                          child: Text(
                            'Verified',
                            style: TextStyle(
                              color: AppColors.success,
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '${widget.vehicleNumber} · ${widget.vehicleType}',
                      style: TextStyle(
                        color: AppColors.textMutedDark,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              // Online/Offline toggle
              GestureDetector(
                onTap: widget.hasActiveTrip ? null : widget.onToggleOnline,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: widget.isOnline
                        ? AppColors.success.withAlpha(38)
                        : AppColors.borderDark,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: widget.isOnline
                          ? AppColors.success
                          : AppColors.textSecondaryLight,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (widget.isOnline)
                        AnimatedBuilder(
                          animation: _pulseAnim,
                          builder: (context, child) {
                            return Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: const Color(
                                  0xFF22c55e,
                                ).withValues(alpha: _pulseAnim.value),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(
                                      0xFF22c55e,
                                    ).withAlpha(128),
                                    blurRadius: 6,
                                  ),
                                ],
                              ),
                            );
                          },
                        )
                      else
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: AppColors.textSecondaryLight,
                            shape: BoxShape.circle,
                          ),
                        ),
                      const SizedBox(width: 6),
                      Text(
                        widget.isOnline ? 'Online' : 'Offline',
                        style: TextStyle(
                          color: widget.isOnline
                              ? AppColors.success
                              : AppColors.textMutedDark,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
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
}
