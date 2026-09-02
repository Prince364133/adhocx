import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import './custom_icon_widget.dart';

// V3 Liquid Glass — BackdropFilter blur + frosted surface + animated pill — LOCKED
class AppNavigation extends StatefulWidget {
  final StatefulNavigationShell navigationShell;
  const AppNavigation({required this.navigationShell, super.key});

  @override
  State<AppNavigation> createState() => _AppNavigationState();
}

class _AppNavigationState extends State<AppNavigation> {
  int _selectedVisualIndex = 0;

  static const List<_TabSpec> _tabs = [
    _TabSpec(
      label: 'Trips',
      icon: 'directions_car',
      selectedIcon: 'directions_car',
      branchIndex: 0,
    ),
    _TabSpec(
      label: 'Wallet',
      icon: 'account_balance_wallet',
      selectedIcon: 'account_balance_wallet',
      branchIndex: 1,
    ),
    _TabSpec(
      label: 'Profile',
      icon: 'person_outline',
      selectedIcon: 'person',
      branchIndex: 2,
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
  void didUpdateWidget(AppNavigation oldWidget) {
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
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SafeArea(
      top: false,
      child: ClipRRect(
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            height: 64,
            decoration: BoxDecoration(
              color: isDark
                  ? const Color(0xFF0d1117).withAlpha(210)
                  : cs.surface.withAlpha(230),
              border: Border(top: BorderSide(color: cs.outline, width: 1)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(_tabs.length, (i) {
                final tab = _tabs[i];
                final isActive = i == _selectedVisualIndex;
                final isStub = tab.branchIndex == null;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => _onTap(i),
                    behavior: HitTestBehavior.opaque,
                    child: Opacity(
                      opacity: isStub ? 0.4 : 1.0,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeOutCubic,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 250),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: isActive
                                    ? const Color(0xFF22c55e).withAlpha(38)
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: CustomIconWidget(
                                iconName: isActive
                                    ? tab.selectedIcon
                                    : tab.icon,
                                color: isActive
                                    ? const Color(0xFF22c55e)
                                    : cs.onSurfaceVariant,
                                size: 22,
                              ),
                            ),
                            const SizedBox(height: 2),
                            AnimatedDefaultTextStyle(
                              duration: const Duration(milliseconds: 200),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: isActive
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                                color: isActive
                                    ? const Color(0xFF22c55e)
                                    : cs.onSurfaceVariant,
                              ),
                              child: Text(tab.label),
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
  final String icon;
  final String selectedIcon;
  final int? branchIndex;
  const _TabSpec({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.branchIndex,
  });
}
