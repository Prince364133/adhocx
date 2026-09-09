import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_colors.dart';

class UserAppNavigation extends StatefulWidget {
  final StatefulNavigationShell navigationShell;
  const UserAppNavigation({required this.navigationShell, super.key});

  @override
  State<UserAppNavigation> createState() => _UserAppNavigationState();
}

class _UserAppNavigationState extends State<UserAppNavigation> {
  int _selectedVisualIndex = 0;

  static const List<_UserTabSpec> _tabs = [
    _UserTabSpec(
      label: 'Home',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home,
      branchIndex: 0,
    ),
    _UserTabSpec(
      label: 'Requirements',
      icon: Icons.assignment_outlined,
      selectedIcon: Icons.assignment,
      branchIndex: 1,
    ),
    _UserTabSpec(
      label: 'Trips',
      icon: Icons.directions_car_outlined,
      selectedIcon: Icons.directions_car,
      branchIndex: 2,
    ),
    _UserTabSpec(
      label: 'Payments',
      icon: Icons.account_balance_wallet_outlined,
      selectedIcon: Icons.account_balance_wallet,
      branchIndex: 3,
    ),
    _UserTabSpec(
      label: 'Profile',
      icon: Icons.person_outline,
      selectedIcon: Icons.person,
      branchIndex: 4,
    ),
  ];

  void _onTap(int visualIndex) {
    final tab = _tabs[visualIndex];
    if (tab.branchIndex == null) return;
    setState(() => _selectedVisualIndex = visualIndex);
    widget.navigationShell.goBranch(
      tab.branchIndex!,
      initialLocation: tab.branchIndex == widget.navigationShell.currentIndex,
    );
  }

  @override
  void didUpdateWidget(UserAppNavigation oldWidget) {
    super.didUpdateWidget(oldWidget);
    for (int i = 0; i < _tabs.length; i++) {
      if (_tabs[i].branchIndex == widget.navigationShell.currentIndex) {
        _selectedVisualIndex = i;
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final activeColor = AppColors.primary;

    return SafeArea(
      top: false,
      child: ClipRRect(
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            height: 64,
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.surfaceElevatedDark.withValues(alpha: 0.92)
                  : Colors.white.withValues(alpha: 0.95),
              border: Border(
                top: BorderSide(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  width: 1,
                ),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(_tabs.length, (i) {
                final tab = _tabs[i];
                final isActive = i == _selectedVisualIndex;

                return Expanded(
                  child: GestureDetector(
                    onTap: () => _onTap(i),
                    behavior: HitTestBehavior.opaque,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      curve: Curves.easeOutCubic,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: isActive
                                  ? activeColor.withValues(alpha: 0.12)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Icon(
                              isActive ? tab.selectedIcon : tab.icon,
                              color: isActive
                                  ? activeColor
                                  : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                              size: 22,
                            ),
                          ),
                          const SizedBox(height: 2),
                          AnimatedDefaultTextStyle(
                            duration: const Duration(milliseconds: 180),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                              color: isActive
                                  ? activeColor
                                  : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                            ),
                            child: Text(
                              tab.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _UserTabSpec {
  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final int? branchIndex;
  const _UserTabSpec({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.branchIndex,
  });
}
