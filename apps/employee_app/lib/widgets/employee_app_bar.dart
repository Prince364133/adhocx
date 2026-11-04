import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_colors.dart';

class EmployeeAppBar extends StatelessWidget implements PreferredSizeWidget {
  final VoidCallback? onBack;
  final Widget? trailing;
  final Color? iconColor;

  const EmployeeAppBar({
    super.key,
    this.onBack,
    this.trailing,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            IconButton(
              onPressed: onBack ?? () {
                if (context.canPop()) {
                  context.pop();
                }
              },
              icon: Icon(
                Icons.arrow_back,
                color: iconColor ?? AppColors.textPrimary,
                size: 24,
              ),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
            ),
            if (trailing != null) trailing!,
          ],
        ),
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(56);
}

