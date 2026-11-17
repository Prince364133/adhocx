import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import './floating_requirement_history_button.dart';

class UserAppScaffold extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const UserAppScaffold({required this.navigationShell, super.key});

  @override
  Widget build(BuildContext context) {
    final isOnHome = navigationShell.currentIndex == 0;
    final isOnRequirements = navigationShell.currentIndex == 1;

    return PopScope(
      canPop: isOnHome,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && !isOnHome) {
          navigationShell.goBranch(0);
        }
      },
      child: Scaffold(
        body: Stack(
          children: [
            SafeArea(
              bottom: false,
              child: navigationShell,
            ),
            if (!isOnRequirements)
              FloatingRequirementHistoryButton(
                onTap: () => navigationShell.goBranch(1),
              ),
          ],
        ),
      ),
    );
  }
}
