import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../widgets/app_cancellation_dialog.dart';
import '../widgets/app_confirmation_dialog.dart';
import '../widgets/app_empty_state.dart';
import '../widgets/app_error_state.dart';
import '../widgets/app_skeleton_loader.dart';
import 'location_permission_modal.dart';
import 'location_unavailable_banner.dart';
import 'network_offline_widget.dart';
import 'session_expired_dialog.dart';

class GlobalStateGalleryScreen extends StatefulWidget {
  const GlobalStateGalleryScreen({super.key});

  @override
  State<GlobalStateGalleryScreen> createState() => _GlobalStateGalleryScreenState();
}

class _GlobalStateGalleryScreenState extends State<GlobalStateGalleryScreen> {
  int _selectedTabIndex = 0;

  final List<String> _tabs = [
    'Empty States',
    'Loading Shimmer',
    'Error & Network',
    'Modals & Banners',
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('Global States Gallery', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Tabs Bar
            Container(
              height: 44,
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 6),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _tabs.length,
                itemBuilder: (context, index) {
                  final isSelected = _selectedTabIndex == index;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(_tabs[index]),
                      selected: isSelected,
                      onSelected: (val) {
                        if (val) setState(() => _selectedTabIndex = index);
                      },
                      selectedColor: AppColors.primary,
                      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.slate200,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
                    ),
                  );
                },
              ),
            ),

            const Divider(height: 1),

            // Tab Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: _buildTabContent(context, isDark),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabContent(BuildContext context, bool isDark) {
    switch (_selectedTabIndex) {
      case 0:
        return const AppEmptyState(
          icon: Icons.assignment_outlined,
          title: 'No Requirements Found',
          description: 'You have not posted any requirements yet. Tap below to create your first requirement.',
          actionText: 'Post Requirement',
        );

      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Shimmer Skeleton Loading State', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Expanded(child: AppSkeletonLoader.cardList(count: 4)),
          ],
        );

      case 2:
        return Column(
          children: [
            const NetworkOfflineWidget(),
            const SizedBox(height: 16),
            Expanded(
              child: AppErrorState(
                title: 'Unable to connect',
                message: 'Failed to communicate with server. Please check your internet connection.',
                onRetry: () {},
              ),
            ),
          ],
        );

      case 3:
      default:
        return SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Interactive Modals & Dialogs Showcase', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              _buildTriggerTile(
                context,
                title: 'Cancellation Bottom Sheet',
                subtitle: 'Select cancellation reason modal',
                icon: Icons.cancel_outlined,
                onTap: () {
                  AppCancellationDialog.show(
                    context,
                    title: 'Cancel Requirement',
                    onCancelConfirmed: (reason, notes) {},
                  );
                },
                isDark: isDark,
              ),
              const SizedBox(height: 10),
              _buildTriggerTile(
                context,
                title: 'Confirmation Popup Modal',
                subtitle: 'Confirm critical / destructive actions',
                icon: Icons.help_outline,
                onTap: () {
                  AppConfirmationDialog.show(
                    context,
                    title: 'Confirm Logout',
                    message: 'Are you sure you want to log out of your account?',
                    confirmText: 'Logout',
                    onConfirm: () {},
                  );
                },
                isDark: isDark,
              ),
              const SizedBox(height: 10),
              _buildTriggerTile(
                context,
                title: 'Location & GPS Permission Modal',
                subtitle: 'Request location access modal',
                icon: Icons.location_on_outlined,
                onTap: () {
                  showModalBottomSheet(context: context, builder: (_) => const LocationPermissionModal());
                },
                isDark: isDark,
              ),
              const SizedBox(height: 10),
              _buildTriggerTile(
                context,
                title: 'Session Expired Modal',
                subtitle: 'Re-authenticate session popup',
                icon: Icons.lock_clock_outlined,
                onTap: () {
                  showDialog(context: context, builder: (_) => const SessionExpiredDialog());
                },
                isDark: isDark,
              ),
              const SizedBox(height: 16),
              const LocationUnavailableBanner(),
            ],
          ),
        );
    }
  }

  Widget _buildTriggerTile(BuildContext context, {required String title, required String subtitle, required IconData icon, required VoidCallback onTap, required bool isDark}) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: ListTile(
        leading: Icon(icon, color: AppColors.primary),
        title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
        subtitle: Text(subtitle, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
        trailing: const Icon(Icons.chevron_right, size: 20),
        onTap: onTap,
      ),
    );
  }
}
