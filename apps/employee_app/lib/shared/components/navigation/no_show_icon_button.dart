import 'package:flutter/material.dart';

import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';

class NoShowIconButton extends StatelessWidget {
  final int count;
  final VoidCallback onPressed;

  const NoShowIconButton({
    super.key,
    required this.count,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = count >= 3
        ? AppColors.error
        : count == 2
            ? AppColors.brandOrange
            : count == 1
                ? AppColors.starAmber
                : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight);

    return Semantics(
      button: true,
      label: 'My No-Shows, $count recorded',
      child: InkWell(
        onTap: onPressed,
        borderRadius: AppRadius.borderPill,
        child: SizedBox(
          width: 42,
          height: 42,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: color.withAlpha(isDark ? 38 : 26),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: color.withAlpha(100),
                  ),
                ),
                child: Icon(
                  Icons.event_busy_rounded,
                  color: color,
                  size: 20,
                ),
              ),
              Positioned(
                right: 0,
                top: 0,
                child: Container(
                  constraints: const BoxConstraints(
                    minWidth: 18,
                    minHeight: 18,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: const BoxDecoration(
                    color: AppColors.error,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '${count.clamp(0, 99)}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                      ),
                    ),
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
