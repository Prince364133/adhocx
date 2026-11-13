import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../routes/app_routes.dart';
import '../../../theme/app_colors.dart';

/// Bottom navigation — same design as the Driver app's rider navigation
/// (apps/mobile/lib/user/widgets/user_app_navigation.dart): frosted surface,
/// 20px top radius, top hairline border, tinted pill behind the active
/// outlined/filled icon, 10px labels. Tabs: 0 Home, 1 Schedule, 2 Trips,
/// 3 Profile.
///
/// Tab routing is built in ([tabRoutes], replace-style `go`) so every screen
/// navigates identically and no tab can be left dead. Pass [onTap] only to
/// intercept taps (e.g. tests).
class EmployeeBottomNavBar extends StatelessWidget {
  /// Active tab, or -1 on screens outside the four tabs (e.g. Safety Center).
  final int currentIndex;
  final ValueChanged<int>? onTap;

  const EmployeeBottomNavBar({
    super.key,
    this.currentIndex = 0,
    this.onTap,
  });

  /// Destination of each tab, by index.
  static const List<String> tabRoutes = [
    AppRoutes.homeUpcomingPickup,
    AppRoutes.scheduleToday,
    AppRoutes.historyOverview,
    AppRoutes.profileDetails,
  ];

  void _handleTap(BuildContext context, int index) {
    if (onTap != null) {
      onTap!(index);
      return;
    }
    if (index == currentIndex) return; // already on this tab
    context.go(tabRoutes[index]);
  }

  static const List<_TabSpec> _tabs = [
    _TabSpec('Home', Icons.home_outlined, Icons.home),
    _TabSpec('Schedule', Icons.calendar_month_outlined, Icons.calendar_month),
    _TabSpec('Trips', Icons.directions_car_outlined, Icons.directions_car),
    _TabSpec('Profile', Icons.person_outline, Icons.person),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    const activeColor = AppColors.primary;
    final idleColor =
        isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    Duration d(int ms) =>
        reduceMotion ? Duration.zero : Duration(milliseconds: ms);

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
              children: List.generate(_tabs.length, (i) {
                final tab = _tabs[i];
                final isActive = i == currentIndex;
                final color = isActive ? activeColor : idleColor;

                return Expanded(
                  child: Semantics(
                    button: true,
                    selected: isActive,
                    label: tab.label,
                    excludeSemantics: true,
                    child: GestureDetector(
                      onTap: () => _handleTap(context, i),
                      behavior: HitTestBehavior.opaque,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            AnimatedContainer(
                              duration: d(200),
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
                                color: color,
                                size: 22,
                              ),
                            ),
                            const SizedBox(height: 2),
                            AnimatedDefaultTextStyle(
                              duration: d(180),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight:
                                    isActive ? FontWeight.w700 : FontWeight.w500,
                                color: color,
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

class _TabSpec {
  final String label;
  final IconData icon;
  final IconData selectedIcon;
  const _TabSpec(this.label, this.icon, this.selectedIcon);
}
