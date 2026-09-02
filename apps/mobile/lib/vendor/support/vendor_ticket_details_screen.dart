import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

enum TicketStatusState {
  open,
  inProgress,
  resolved,
}

class VendorTicketDetailsScreen extends StatefulWidget {
  final TicketStatusState initialState;

  const VendorTicketDetailsScreen({
    super.key,
    this.initialState = TicketStatusState.open,
  });

  @override
  State<VendorTicketDetailsScreen> createState() => _VendorTicketDetailsScreenState();
}

class _VendorTicketDetailsScreenState extends State<VendorTicketDetailsScreen> {
  late TicketStatusState _currentState;
  int _rating = 0;

  @override
  void initState() {
    super.initState();
    _currentState = widget.initialState;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final updates = [
      {'time': '10 May 2025, 08:30 PM', 'text': 'Our team has received your ticket and will get back to you soon.'},
      if (_currentState != TicketStatusState.open) ...[
        {'time': '10 May 2025, 09:45 PM', 'text': 'Our team is looking into this. Please allow some time.'},
        {'time': '11 May 2025, 10:30 AM', 'text': 'We are processing your request.'},
      ],
      if (_currentState == TicketStatusState.resolved) ...[
        {'time': '11 May 2025, 02:45 PM', 'text': 'Ticket has been marked as resolved.'},
      ],
    ];

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('Ticket Details', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // State Switcher Carousel
            Container(
              height: 42,
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 4),
              child: Row(
                children: TicketStatusState.values.map((st) {
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Info & Badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('TKT-250510-0001', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 2),
                            Text('Payment not received', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                            Text('10 May 2025, 07:15 PM', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: _getColor(_currentState).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(AppRadius.sm)),
                          child: Text(_getLabel(_currentState), style: TextStyle(color: _getColor(_currentState), fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    if (_currentState == TicketStatusState.resolved) ...[
                      // Resolution Banner
                      Text('Resolution', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.success.withValues(alpha: 0.2)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.check_circle_outline, color: AppColors.success, size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Your payment has been processed successfully and the amount will reflect in your account shortly.',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                  ),
                                  const SizedBox(height: 4),
                                  Text('11 May 2025, 02:45 PM', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                    ],

                    // Particulars Box
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        children: [
                          _buildRow(context, 'Category', 'Payments', isDark),
                          const Divider(),
                          _buildRow(context, 'Priority', 'High', isDark, isRed: true),
                          const Divider(),
                          _buildRow(context, 'Status', _getLabel(_currentState), isDark, colorOverride: _getColor(_currentState)),
                          const Divider(),
                          _buildRow(context, 'Last Updated', '10 May 2025, 08:30 PM', isDark),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Updates Feed
                    Text('Updates', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),

                    Column(
                      children: List.generate(updates.length, (index) {
                        final item = updates[index];
                        final bool isLast = index == updates.length - 1;

                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Column(
                              children: [
                                const Icon(Icons.circle, size: 10, color: Color(0xFF6C5CE7)),
                                if (!isLast) Container(width: 2, height: 44, color: Colors.grey[300]),
                              ],
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.only(bottom: 10.0),
                                child: Container(
                                  padding: const EdgeInsets.all(AppSpacing.md),
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                    border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item['time']!, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
                                      const SizedBox(height: 2),
                                      Text(item['text']!, style: TextStyle(fontSize: 12, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        );
                      }),
                    ),

                    if (_currentState == TicketStatusState.resolved) ...[
                      const SizedBox(height: AppSpacing.lg),
                      Center(
                        child: Column(
                          children: [
                            Text('How was your experience?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(5, (index) {
                                return IconButton(
                                  onPressed: () => setState(() => _rating = index + 1),
                                  icon: Icon(
                                    index < _rating ? Icons.star : Icons.star_border,
                                    color: const Color(0xFF6C5CE7),
                                    size: 26,
                                  ),
                                );
                              }),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: AppSpacing.xl),

                    _buildActions(context),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getLabel(TicketStatusState state) {
    switch (state) {
      case TicketStatusState.open:
        return 'Open';
      case TicketStatusState.inProgress:
        return 'In-Progress';
      case TicketStatusState.resolved:
        return 'Resolved';
    }
  }

  Color _getColor(TicketStatusState state) {
    switch (state) {
      case TicketStatusState.open:
        return AppColors.info;
      case TicketStatusState.inProgress:
        return Colors.orange;
      case TicketStatusState.resolved:
        return AppColors.success;
    }
  }

  Widget _buildRow(BuildContext context, String label, String value, bool isDark, {bool isRed = false, Color? colorOverride}) {
    Color color = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    if (isRed) color = AppColors.error;
    if (colorOverride != null) color = colorOverride;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color)),
        ],
      ),
    );
  }

  Widget _buildActions(BuildContext context) {
    if (_currentState == TicketStatusState.resolved) {
      return AppPrimaryButton(
        text: 'Close Ticket',
        onPressed: () => context.go(AppRoutes.vendorSupportCenterScreen),
      );
    }

    return OutlinedButton(
      onPressed: () {},
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        foregroundColor: const Color(0xFF6C5CE7),
        side: const BorderSide(color: Color(0xFF6C5CE7)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
      ),
      child: const Text('Add Comment', style: TextStyle(fontWeight: FontWeight.bold)),
    );
  }
}
