import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import './global_states_suite.dart';

enum GlobalStateType {
  noInternet,
  serverError,
  somethingWentWrong,
  sessionExpired,
  permissionRequired,
  locationPermission,
  notificationPermission,
  loading,
  empty,
  maintenance,
}

/// Interactive Showcase Gallery Screen for inspecting all 10 Global System States.
class GlobalStateGalleryScreen extends StatefulWidget {
  const GlobalStateGalleryScreen({super.key});

  @override
  State<GlobalStateGalleryScreen> createState() => _GlobalStateGalleryScreenState();
}

class _GlobalStateGalleryScreenState extends State<GlobalStateGalleryScreen> {
  GlobalStateType _selectedState = GlobalStateType.noInternet;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.homeScreen);
                          }
                        },
                        icon: const Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '10 Global States Gallery',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Pill Selector Bar ─────────────────────────────────────────
                Container(
                  color: AppColors.surfaceLight,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: GlobalStateType.values.map((state) {
                        final isSelected = _selectedState == state;
                        final label = switch (state) {
                          GlobalStateType.noInternet => '1. No Internet',
                          GlobalStateType.serverError => '2. Server Error',
                          GlobalStateType.somethingWentWrong => '3. Went Wrong',
                          GlobalStateType.sessionExpired => '4. Session Expired',
                          GlobalStateType.permissionRequired => '5. Permission Req',
                          GlobalStateType.locationPermission => '6. Location Perm',
                          GlobalStateType.notificationPermission => '7. Notification Perm',
                          GlobalStateType.loading => '8. Loading',
                          GlobalStateType.empty => '9. Empty',
                          GlobalStateType.maintenance => '10. Maintenance',
                        };

                        return GestureDetector(
                          onTap: () => setState(() => _selectedState = state),
                          child: Container(
                            margin: const EdgeInsets.only(right: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.primary : AppColors.bgLight,
                              borderRadius: BorderRadius.circular(AppRadius.full),
                              border: Border.all(
                                color: isSelected ? AppColors.primary : AppColors.borderLight,
                              ),
                            ),
                            child: Text(
                              label,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                color: isSelected ? Colors.white : AppColors.textPrimaryLight,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),
                const Divider(height: 1, color: AppColors.borderLight),

                // ── Displayed State Body ─────────────────────────────────────
                Expanded(
                  child: Center(
                    child: switch (_selectedState) {
                      GlobalStateType.noInternet => const NoInternetWidget(),
                      GlobalStateType.serverError => const ServerErrorWidget(),
                      GlobalStateType.somethingWentWrong => const SomethingWentWrongWidget(),
                      GlobalStateType.sessionExpired => const SessionExpiredWidget(),
                      GlobalStateType.permissionRequired => const PermissionRequiredWidget(),
                      GlobalStateType.locationPermission => const LocationPermissionWidget(),
                      GlobalStateType.notificationPermission => const NotificationPermissionWidget(),
                      GlobalStateType.loading => const GlobalLoadingWidget(),
                      GlobalStateType.empty => const GlobalEmptyWidget(
                          title: 'No Trips Available',
                          message: 'There are currently no active or upcoming trips assigned to you.',
                          icon: Icons.directions_car_outlined,
                        ),
                      GlobalStateType.maintenance => const MaintenanceWidget(),
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
