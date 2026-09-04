import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

enum RequirementFulfillmentState {
  searching,
  fulfilled,
  failed,
}

class UserRequirementStatusScreen extends StatefulWidget {
  final RequirementFulfillmentState initialState;

  const UserRequirementStatusScreen({
    super.key,
    this.initialState = RequirementFulfillmentState.searching,
  });

  @override
  State<UserRequirementStatusScreen> createState() => _UserRequirementStatusScreenState();
}

class _UserRequirementStatusScreenState extends State<UserRequirementStatusScreen> {
  late RequirementFulfillmentState _currentState;

  @override
  void initState() {
    super.initState();
    _currentState = widget.initialState;
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
        title: Text('Requirement Status', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // State Switcher
            Container(
              height: 42,
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 4),
              child: Row(
                children: RequirementFulfillmentState.values.map((st) {
                  final isSelected = _currentState == st;
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4.0),
                      child: ChoiceChip(
                        label: Text(_getLabel(st)),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) setState(() => _currentState = st);
                        },
                        selectedColor: _getColor(st),
                        backgroundColor: isDark ? AppColors.surfaceDark : Colors.grey[200],
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                          fontSize: 11,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Airport Transfer', style: AppTypography.h2(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                            Text('REQ-250510-0001', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: _getColor(_currentState).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(AppRadius.sm)),
                          child: Text(_getLabel(_currentState), style: TextStyle(color: _getColor(_currentState), fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    // Graphic & Message
                    _buildGraphicAndMessage(context, isDark),

                    const SizedBox(height: AppSpacing.xl),

                    // Breakdown or Options
                    _buildDetailsBox(context, isDark),

                    const SizedBox(height: AppSpacing.xl),

                    _buildPrimaryCTA(context),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getLabel(RequirementFulfillmentState state) {
    switch (state) {
      case RequirementFulfillmentState.searching:
        return 'Searching';
      case RequirementFulfillmentState.fulfilled:
        return 'Fulfilled';
      case RequirementFulfillmentState.failed:
        return 'Failed';
    }
  }

  Color _getColor(RequirementFulfillmentState state) {
    switch (state) {
      case RequirementFulfillmentState.searching:
        return Colors.orange;
      case RequirementFulfillmentState.fulfilled:
        return AppColors.success;
      case RequirementFulfillmentState.failed:
        return AppColors.error;
    }
  }

  Widget _buildGraphicAndMessage(BuildContext context, bool isDark) {
    switch (_currentState) {
      case RequirementFulfillmentState.fulfilled:
        return Column(
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.12), shape: BoxShape.circle),
              child: const Center(
                child: CircleAvatar(
                  radius: 36,
                  backgroundColor: AppColors.success,
                  child: Icon(Icons.check, size: 40, color: Colors.white),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text('All Set!', style: AppTypography.h1(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text('All 10 vehicles have been assigned.', style: AppTypography.body(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          ],
        );

      case RequirementFulfillmentState.failed:
        return Column(
          children: [
            Stack(
              alignment: Alignment.bottomRight,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(color: AppColors.error.withValues(alpha: 0.08), shape: BoxShape.circle),
                  child: const Icon(Icons.search, size: 64, color: AppColors.error),
                ),
                const CircleAvatar(radius: 14, backgroundColor: AppColors.error, child: Icon(Icons.close, size: 16, color: Colors.white)),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Text('Unable to find available drivers', style: AppTypography.h2(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text("We couldn't find available drivers for the required vehicles at this time.", textAlign: TextAlign.center, style: AppTypography.body(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          ],
        );

      case RequirementFulfillmentState.searching:
        return Column(
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 130,
                  height: 130,
                  child: CircularProgressIndicator(
                    value: 0.8,
                    strokeWidth: 10,
                    backgroundColor: isDark ? Colors.grey[800] : Colors.grey[200],
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF6C5CE7)),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('8 / 10', style: AppTypography.h2(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                    Text('Vehicles Fulfilled', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            const Text('2 Vehicles Remaining', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 4),
            Text('We are still searching for available drivers.', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          ],
        );
    }
  }

  Widget _buildDetailsBox(BuildContext context, bool isDark) {
    if (_currentState == RequirementFulfillmentState.failed) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.error.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.error.withValues(alpha: 0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('What you can do?', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold, fontSize: 14)),
            const SizedBox(height: 10),
            _buildOption('Try again in some time'),
            const SizedBox(height: 8),
            _buildOption('Increase pickup time flexibility'),
            const SizedBox(height: 8),
            _buildOption('Expand search area'),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        children: [
          _buildRow('Assigned', _currentState == RequirementFulfillmentState.fulfilled ? '10 Vehicles' : '8 Vehicles', AppColors.success, isDark),
          const Divider(),
          _buildRow('Searching', _currentState == RequirementFulfillmentState.fulfilled ? '0 Vehicles' : '2 Vehicles', AppColors.info, isDark),
          const Divider(),
          _buildRow('On Trip', '6 Vehicles', const Color(0xFF6C5CE7), isDark),
        ],
      ),
    );
  }

  Widget _buildOption(String text) {
    return Row(
      children: [
        const Icon(Icons.refresh, size: 16, color: AppColors.error),
        const SizedBox(width: 8),
        Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
      ],
    );
  }

  Widget _buildRow(String label, String value, Color color, bool isDark) {
    return Row(
      children: [
        Text(label, style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
        const Spacer(),
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 13)),
      ],
    );
  }

  Widget _buildPrimaryCTA(BuildContext context) {
    if (_currentState == RequirementFulfillmentState.failed) {
      return AppPrimaryButton(
        text: 'Modify Requirement',
        onPressed: () => context.push(AppRoutes.userEditRequirementScreen),
      );
    }
    return AppPrimaryButton(
      text: 'View Driver Assignments →',
      onPressed: () => context.push(AppRoutes.userDriverAssignmentsListScreen),
    );
  }
}
