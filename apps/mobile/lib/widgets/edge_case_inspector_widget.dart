import 'package:flutter/material.dart';
import '../services/edge_case_manager.dart';
import '../theme/app_colors.dart';

/// Interactive top debug bar to toggle all 4 edge cases live in the UI.
class EdgeCaseInspectorWidget extends StatelessWidget {
  const EdgeCaseInspectorWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: EdgeCaseManager.instance,
      builder: (context, _) {
        final mgr = EdgeCaseManager.instance;

        return Container(
          color: AppColors.textPrimaryLight,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            children: [
              Text(
                'EDGE CASES:',
                style: TextStyle(
                  color: AppColors.warning,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildChip(
                        label: 'Location Perm',
                        isActive: !mgr.isLocationPermissionGranted,
                        onTap: () => mgr.toggleLocationPermission(),
                      ),
                      _buildChip(
                        label: 'GPS Fix',
                        isActive: !mgr.isLocationAvailable,
                        onTap: () => mgr.toggleLocationAvailability(),
                      ),
                      _buildChip(
                        label: 'Offline',
                        isActive: !mgr.isNetworkOnline,
                        onTap: () => mgr.toggleNetworkOnline(),
                      ),
                      _buildChip(
                        label: 'Session Expired',
                        isActive: !mgr.isSessionValid,
                        onTap: () => mgr.toggleSessionValid(),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildChip({
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: isActive ? AppColors.error : AppColors.borderDark,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Row(
          children: [
            Icon(
              isActive ? Icons.warning_amber_rounded : Icons.check_circle_outline,
              size: 11,
              color: Colors.white,
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
