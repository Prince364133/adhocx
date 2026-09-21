import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserRaiseIssueScreen extends StatefulWidget {
  final String? tripId;
  const UserRaiseIssueScreen({super.key, this.tripId});

  @override
  State<UserRaiseIssueScreen> createState() => _UserRaiseIssueScreenState();
}

class _UserRaiseIssueScreenState extends State<UserRaiseIssueScreen> {
  String? _selectedCategory = 'Trip Issue';
  final List<String> _categories = ['Trip Issue', 'Payments', 'Driver Issue', 'Vehicle Condition', 'Billing', 'Other'];

  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final title = _titleController.text.trim();
    final description = _descController.text.trim();

    if (title.isEmpty) {
      Fluttertoast.showToast(msg: 'Please enter a brief issue title');
      return;
    }

    if (description.isEmpty) {
      Fluttertoast.showToast(msg: 'Please enter details about the issue');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      String? targetTripId = widget.tripId;

      if (targetTripId == null || targetTripId.isEmpty) {
        // Fetch recent trips to associate this dispute with
        final trips = await UserService.instance.getTrips();
        if (trips.isNotEmpty) {
          final latestTrip = trips.first as Map<String, dynamic>;
          targetTripId = latestTrip['id']?.toString();
        }
      }

      if (targetTripId == null || targetTripId.isEmpty) {
        Fluttertoast.showToast(
          msg: 'A booked trip is required to file an issue ticket. Please book a trip first.',
          toastLength: Toast.LENGTH_LONG,
        );
        setState(() => _isSubmitting = false);
        return;
      }

      final reason = '${_selectedCategory ?? "Issue"}: $title';
      final res = await UserService.instance.createDispute(
        tripId: targetTripId,
        reason: reason,
        description: description,
      );

      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Issue ticket submitted successfully',
          backgroundColor: AppColors.accentGreenDark,
          textColor: Colors.white,
        );

        final resultData = res is Map<String, dynamic>
            ? res
            : {
                'id': 'TKT-${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}',
                'reason': reason,
                'description': description,
                'status': 'OPEN',
                'createdAt': DateTime.now().toIso8601String(),
              };

        context.push(AppRoutes.userTicketDetailsOpenScreen, extra: resultData);
      }
    } catch (e) {
      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Failed to submit issue: ${e.toString().replaceAll("Exception: ", "")}',
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

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
        title: Text('Raise an Issue', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Issue Category Dropdown
              Text('Issue Category', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                hint: const Text('Select Category', style: TextStyle(fontSize: 13)),
                items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 13)))).toList(),
                onChanged: (val) => setState(() => _selectedCategory = val),
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Issue Title
              Text('Issue Title', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextField(
                controller: _titleController,
                decoration: InputDecoration(
                  hintText: 'Briefly describe your issue',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Description
              Text('Description', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextField(
                controller: _descController,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Please provide details about your issue',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              AppPrimaryButton(
                text: _isSubmitting ? 'Submitting...' : 'Submit Issue',
                onPressed: _isSubmitting ? null : _handleSubmit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
