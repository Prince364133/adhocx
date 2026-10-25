import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import '../../shared/widgets/app_profile_avatar.dart';

class UserDriverDetailsScreen extends StatefulWidget {
  final Map<String, dynamic>? trip;
  const UserDriverDetailsScreen({super.key, this.trip});

  @override
  State<UserDriverDetailsScreen> createState() => _UserDriverDetailsScreenState();
}

class _UserDriverDetailsScreenState extends State<UserDriverDetailsScreen> {
  Map<String, dynamic>? _trip;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (widget.trip != null) {
      _trip = widget.trip;
      _isLoading = false;
    } else {
      _loadLatestTrip();
    }
  }

  Future<void> _loadLatestTrip() async {
    setState(() => _isLoading = true);
    try {
      final list = await UserService.instance.getTrips();
      if (list.isNotEmpty && mounted) {
        setState(() => _trip = list.first as Map<String, dynamic>);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final trip = _trip ?? {};
    final driver = trip['driver'] as Map<String, dynamic>?;
    final driverUser = driver?['user'] as Map<String, dynamic>?;
    final driverName = (trip['driverName'] ?? driverUser?['fullName'] ?? driver?['fullName'] ?? 'Assigned Driver').toString();
    final driverPhone = (trip['driverPhone'] ?? driverUser?['phone'] ?? driver?['phone'] ?? '\u2014').toString();
    final rating = (driver?['averageRating'] ?? driver?['rating'] ?? 5.0).toString();
    final licenseNumber = driver?['licenseNumber'] ?? '\u2014';
    final vehiclePlate = (trip['vehiclePlate'] ?? driver?['vehiclePlate'] ?? '\u2014').toString();
    final vehicleModel = (trip['vehicleModel'] ?? driver?['vehicleModel'] ?? trip['vehicleType'] ?? '\u2014').toString();
    final totalTrips = (driver?['totalTrips'] ?? 0).toString();
    final driverPhoto = (trip['driverPhoto'] ?? driver?['photoUrl'] ?? driver?['profilePhotoUrl'] ?? driverUser?['photoUrl'])?.toString();

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text(
          'Driver Details',
          style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: Icon(Icons.phone, color: AppColors.primary),
          ),
          IconButton(
            onPressed: () {},
            icon: Icon(Icons.chat_bubble_outline, color: AppColors.primary),
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    // Driver Avatar Header + Verified Badge
                    Center(
                      child: Column(
                        children: [
                          AppProfileAvatar(
                            radius: 36,
                            imageUrl: driverPhoto,
                            name: driverName,
                            isDark: isDark,
                          ),
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                driverName,
                                style: AppTypography.h2(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Row(
                                children: [
                                  const Icon(Icons.star, size: 16, color: AppColors.starAmber),
                                  const SizedBox(width: 2),
                                  Text(rating, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Icon(Icons.verified, size: 14, color: AppColors.success),
                              SizedBox(width: 4),
                              Text('Verified Driver', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 11)),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    // Contact Container Card
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        children: [
                          IconButton(
                            onPressed: () {
                              final clean = driverPhone.replaceAll(RegExp(r'[^0-9+]'), '');
                              if (clean.isNotEmpty && clean != '\u2014') {
                                launchUrl(Uri.parse('tel:$clean'));
                              }
                            },
                            icon: Icon(Icons.phone_outlined, color: AppColors.primary),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: InkWell(
                              onTap: () {
                                final clean = driverPhone.replaceAll(RegExp(r'[^0-9+]'), '');
                                if (clean.isNotEmpty && clean != '\u2014') {
                                  launchUrl(Uri.parse('tel:$clean'));
                                }
                              },
                              child: Text(
                                driverPhone,
                                style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: () {
                              final clean = driverPhone.replaceAll(RegExp(r'[^0-9+]'), '');
                              if (clean.isNotEmpty && clean != '\u2014') {
                                launchUrl(Uri.parse('tel:$clean'));
                              }
                            },
                            icon: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), shape: BoxShape.circle),
                              child: Icon(Icons.call, color: AppColors.primary, size: 18),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Driver Information Grid
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Driver Information', style: AppTypography.h4(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          _buildInfoLine(context, 'Assigned Vehicle', '$vehiclePlate ($vehicleModel)', isDark),
                          const Divider(),
                          _buildInfoLine(context, 'License No.', licenseNumber, isDark),
                          const Divider(),
                          _buildInfoLine(context, 'Total Completed Trips', totalTrips, isDark),
                          const Divider(),
                          _buildInfoLine(context, 'Status', (trip['status'] ?? 'ASSIGNED').toString(), isDark),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    AppPrimaryButton(
                      text: 'View Live Location',
                      onPressed: () => context.push(AppRoutes.userActiveTripScreen, extra: trip),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    OutlinedButton(
                      onPressed: () => context.push(AppRoutes.userCancelAssignmentScreen, extra: trip),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        foregroundColor: AppColors.error,
                        side: BorderSide(color: AppColors.error.withValues(alpha: 0.5)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                      child: const Text('Cancel Assignment', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildInfoLine(BuildContext context, String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          Text(value, style: AppTypography.caption(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
