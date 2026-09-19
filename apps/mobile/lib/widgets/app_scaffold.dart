import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../presentation/edge_cases/location_permission_modal.dart';
import '../presentation/edge_cases/location_unavailable_banner.dart';
import '../presentation/edge_cases/network_offline_widget.dart';
import '../presentation/edge_cases/session_expired_dialog.dart';
import '../services/edge_case_manager.dart';
import './app_navigation.dart';

class AppScaffold extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const AppScaffold({required this.navigationShell, super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: EdgeCaseManager.instance,
      builder: (context, _) {
        final mgr = EdgeCaseManager.instance;

        return Scaffold(
          extendBody: true,
          body: SafeArea(
            bottom: false,
            child: Stack(
              children: [
                Column(
                  children: [
                    // Network Offline Persistent Banner
                    if (!mgr.isNetworkOnline)
                      const NetworkOfflineWidget(isBannerOnly: true),

                    // Location Unavailable Persistent Banner
                    if (mgr.isLocationPermissionGranted && !mgr.isLocationAvailable)
                      const LocationUnavailableBanner(),

                    // Main Content Body (Or Full Screen Offline Fallback)
                    Expanded(
                      child: !mgr.isNetworkOnline
                          ? const NetworkOfflineWidget(isBannerOnly: false)
                          : navigationShell,
                    ),
                  ],
                ),

                // Location Permission Required Modal Overlay
                if (!mgr.isLocationPermissionGranted)
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: const LocationPermissionModal(),
                  ),

                // Session Expired Dialog Modal
                if (!mgr.isSessionValid)
                  Container(
                    color: Colors.black54,
                    alignment: Alignment.center,
                    child: const SessionExpiredDialog(),
                  ),
              ],
            ),
          ),
          bottomNavigationBar: AppNavigation(navigationShell: navigationShell),
        );
      },
    );
  }
}
