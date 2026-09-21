import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserDraftRequirementsScreen extends StatefulWidget {
  const UserDraftRequirementsScreen({super.key});

  @override
  State<UserDraftRequirementsScreen> createState() => _UserDraftRequirementsScreenState();
}

class _UserDraftRequirementsScreenState extends State<UserDraftRequirementsScreen> {
  String _selectedTab = 'All Drafts';
  bool _isLoading = true;
  List<dynamic> _drafts = [];

  final List<String> _tabs = ['All Drafts', 'Today', 'This Week', 'This Month'];

  static const _months = [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  @override
  void initState() {
    super.initState();
    _fetchDrafts();
  }

  Future<void> _fetchDrafts() async {
    try {
      final res = await UserService.instance.getRequirements(status: 'DRAFT');
      if (mounted) {
        setState(() {
          _drafts = res;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatDateTime(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return '—';
    try {
      final dt = DateTime.parse(isoDate).toLocal();
      final day = dt.day.toString().padLeft(2, '0');
      final month = (dt.month >= 1 && dt.month <= 12) ? _months[dt.month] : '';
      final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final ampm = dt.hour >= 12 ? 'PM' : 'AM';
      final min = dt.minute.toString().padLeft(2, '0');
      return '$day $month ${dt.year} • $hour:$min $ampm';
    } catch (_) {
      return isoDate;
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
        title: Text(
          'Drafts',
          style: AppTypography.h2(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _fetchDrafts,
            icon: Icon(Icons.refresh, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips Row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            child: Row(
              children: _tabs.map((tab) {
                final isSelected = _selectedTab == tab;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ChoiceChip(
                    label: Text(tab),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedTab = tab);
                    },
                    selectedColor: AppColors.primary,
                    backgroundColor: isDark ? AppColors.surfaceDark : AppColors.slate200,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: AppSpacing.xs),

          // Drafts List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _drafts.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.drafts_outlined,
                                size: 56,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No Drafts Saved',
                                style: AppTypography.h3(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'When you save an incomplete booking, it will appear here for you to finish.',
                                textAlign: TextAlign.center,
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                              const SizedBox(height: 24),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                ),
                                onPressed: () => context.push(AppRoutes.userCreateRequirementScreen),
                                child: const Text('Create Booking'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchDrafts,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          itemCount: _drafts.length,
                          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                          itemBuilder: (context, index) {
                            final draft = _drafts[index] is Map ? _drafts[index] as Map<String, dynamic> : <String, dynamic>{};
                            final vehicleType = draft['vehicleType'] ?? 'Sedan';
                            final quantity = draft['quantity'] ?? 1;
                            final title = draft['notes'] != null && draft['notes'].toString().isNotEmpty
                                ? draft['notes'].toString().split('|').first.trim()
                                : '$vehicleType Booking';

                            final pickup = draft['pickupLocation'] as Map<String, dynamic>?;
                            final drop = draft['dropLocation'] as Map<String, dynamic>?;
                            final pickupAddr = pickup?['address'] ?? '—';
                            final dropAddr = drop?['address'] ?? '—';
                            final route = '$pickupAddr → $dropAddr';
                            final time = _formatDateTime(draft['reportingTime'] as String? ?? draft['createdAt'] as String?);

                            return Container(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        title,
                                        style: AppTypography.h4(
                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const Icon(Icons.more_horiz, color: AppColors.slate400),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '$vehicleType • $quantity ${quantity == 1 ? "Vehicle" : "Vehicles"}',
                                    style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    route,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        time,
                                        style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                      ),
                                      OutlinedButton(
                                        onPressed: () => context.push(AppRoutes.userCreateRequirementScreen),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: AppColors.primary,
                                          side: BorderSide(color: AppColors.primary),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                        ),
                                        child: const Text('Continue', style: TextStyle(fontWeight: FontWeight.bold)),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
