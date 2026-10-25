import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_profile_avatar.dart';

class UserCancelAssignmentScreen extends StatefulWidget {
  final Map<String, dynamic>? trip;
  const UserCancelAssignmentScreen({super.key, this.trip});

  @override
  State<UserCancelAssignmentScreen> createState() => _UserCancelAssignmentScreenState();
}

class _UserCancelAssignmentScreenState extends State<UserCancelAssignmentScreen> {
  String _selectedReason = 'Driver not responding';
  final TextEditingController _otherReasonController = TextEditingController();
  bool _isSubmitting = false;

  final List<String> _reasons = [
    'Driver not responding',
    'Taking too long to arrive',
    'Vehicle not suitable',
    'Other',
  ];

  @override
  void dispose() {
    _otherReasonController.dispose();
    super.dispose();
  }

  Future<void> _handleCancel() async {
    final tripId = widget.trip?['id'] as String?;
    final reason = _selectedReason == 'Other' ? _otherReasonController.text : _selectedReason;

    setState(() => _isSubmitting = true);
    try {
      if (tripId != null) {
        await UserService.instance.cancelTrip(tripId, reason: reason);
      }
      Fluttertoast.showToast(msg: 'Driver assignment cancelled successfully');
      if (mounted) context.pop();
    } catch (e) {
      Fluttertoast.showToast(msg: 'Cancelled locally');
      if (mounted) context.pop();
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final trip = widget.trip ?? {};
    final driver = trip['driver'] as Map<String, dynamic>?;
    final driverUser = driver?['user'] as Map<String, dynamic>?;
    final driverName = driverUser?['fullName'] ?? driver?['fullName'] ?? 'Assigned Driver';
    final vehiclePlate = driver?['vehiclePlate'] ?? trip['vehiclePlate'] ?? 'Vehicle Assigned';
    final vehicleModel = driver?['vehicleModel'] ?? trip['vehicleModel'] ?? 'Sedan';
    final status = (trip['status'] ?? 'ASSIGNED').toString();
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
          'Cancel Assignment',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Driver Header Card
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Row(
                  children: [
                    AppProfileAvatar(
                      radius: 20,
                      imageUrl: driverPhoto,
                      name: driverName.toString(),
                      isDark: isDark,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(driverName, style: AppTypography.h4(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 2),
                          Text('$vehiclePlate • $vehicleModel', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(AppRadius.sm)),
                      child: Text(status, style: TextStyle(color: AppColors.success, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              Text('Reason for Cancellation', style: AppTypography.h4(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
              const SizedBox(height: AppSpacing.sm),

              // Radio Options List
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: _reasons.map((reason) {
                    // ignore: deprecated_member_use
                    return RadioListTile<String>(
                      value: reason,
                      // ignore: deprecated_member_use
                      groupValue: _selectedReason,
                      activeColor: AppColors.error,
                      title: Text(reason, style: TextStyle(fontSize: 13, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                      // ignore: deprecated_member_use
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedReason = val);
                      },
                    );
                  }).toList(),
                ),
              ),

              if (_selectedReason == 'Other') ...[
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: _otherReasonController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Please specify reason',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  ),
                ),
              ],

              const SizedBox(height: AppSpacing.xl),

              // Red Cancel Assignment Button
              ElevatedButton(
                onPressed: _isSubmitting ? null : _handleCancel,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.error,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
                child: _isSubmitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Confirm Cancel Assignment', style: TextStyle(fontWeight: FontWeight.bold)),
              ),

              const SizedBox(height: AppSpacing.md),

              OutlinedButton(
                onPressed: () => context.pop(),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
                child: const Text('Back', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
