import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserVehicleDetailsScreen extends StatefulWidget {
  final Map<String, dynamic>? vehicleData;
  const UserVehicleDetailsScreen({super.key, this.vehicleData});

  @override
  State<UserVehicleDetailsScreen> createState() => _UserVehicleDetailsScreenState();
}

class _UserVehicleDetailsScreenState extends State<UserVehicleDetailsScreen> {
  Map<String, dynamic>? _vehicle;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (widget.vehicleData != null) {
      _vehicle = widget.vehicleData;
      _isLoading = false;
    } else {
      _loadVehicle();
    }
  }

  Future<void> _loadVehicle() async {
    setState(() => _isLoading = true);
    try {
      final list = await UserService.instance.getTrips();
      if (list.isNotEmpty && mounted) {
        final t = list.first as Map<String, dynamic>;
        final driver = t['driver'] as Map<String, dynamic>?;
        _vehicle = {
          'plate': driver?['vehiclePlate'] ?? t['vehiclePlate'] ?? '—',
          'model': driver?['vehicleModel'] ?? t['vehicleModel'] ?? 'Commercial Fleet',
          'type': driver?['vehicleType'] ?? t['vehicleType'] ?? 'Sedan',
          'year': driver?['vehicleYear']?.toString() ?? '—',
          'seating': driver?['seatingCapacity'] ?? '4 + 1 Passengers',
          'fuel': driver?['fuelType'] ?? '—',
          'rcStatus': driver?['rcStatus'] ?? 'Verified Commercial',
        };
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

    final v = _vehicle ?? {};
    final plate = v['plate'] ?? v['vehiclePlate'] ?? '—';
    final model = v['model'] ?? v['vehicleModel'] ?? 'Commercial Fleet';
    final type = v['type'] ?? v['vehicleType'] ?? 'Commercial Vehicle';
    final seating = v['seating'] ?? '—';
    final fuel = v['fuel'] ?? '—';

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('Vehicle Details', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Vehicle Photo Box
                    Container(
                      height: 160,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.slate100,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.directions_car, size: 72, color: AppColors.primary),
                            const SizedBox(height: 4),
                            Text('$model • $type', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    Text(plate, style: AppTypography.h1(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                    Text(type, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),

                    const SizedBox(height: AppSpacing.lg),

                    // Specifications Table
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        children: [
                          _buildSpecRow(context, 'Vehicle Category', type, isDark),
                          const Divider(),
                          _buildSpecRow(context, 'Make / Model', model, isDark),
                          const Divider(),
                          _buildSpecRow(context, 'Registration Number', plate, isDark),
                          const Divider(),
                          _buildSpecRow(context, 'Seating Capacity', seating, isDark),
                          const Divider(),
                          _buildSpecRow(context, 'Fuel Type', fuel, isDark),
                          const Divider(),
                          _buildSpecRow(context, 'RC Status', 'Verified', isDark, isBadge: true),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildSpecRow(BuildContext context, String label, String value, bool isDark, {bool isBadge = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          if (isBadge)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(AppRadius.sm)),
              child: const Text('Verified', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 11)),
            )
          else
            Text(value, style: AppTypography.caption(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
