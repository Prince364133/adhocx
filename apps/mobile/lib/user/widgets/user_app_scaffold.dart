import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import './user_app_navigation.dart';

class UserAppScaffold extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const UserAppScaffold({required this.navigationShell, super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: navigationShell,
      ),
      bottomNavigationBar: UserAppNavigation(navigationShell: navigationShell),
    );
  }
}
