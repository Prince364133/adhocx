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

class UserTicketDetailsScreen extends StatefulWidget {
  final TicketStatusState initialState;
  final Map<String, dynamic>? ticketData;

  const UserTicketDetailsScreen({
    super.key,
    this.initialState = TicketStatusState.open,
    this.ticketData,
  });

  @override
  State<UserTicketDetailsScreen> createState() => _UserTicketDetailsScreenState();
}

class _UserTicketDetailsScreenState extends State<UserTicketDetailsScreen> {
  late TicketStatusState _currentState;
  int _rating = 0;

  static const _months = [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  @override
  void initState() {
    super.initState();
    final status = widget.ticketData?['status']?.toString().toUpperCase();
    if (status == 'RESOLVED' || status == 'CLOSED') {
      _currentState = TicketStatusState.resolved;
    } else if (status == 'UNDER_REVIEW' || status == 'IN_PROGRESS') {
      _currentState = TicketStatusState.inProgress;
    } else {
      _currentState = widget.initialState;
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
      return '$day $month ${dt.year}, $hour:$min $ampm';
    } catch (_) {
      return isoDate;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final data = widget.ticketData ?? {};
    final rawId = (data['id'] ?? data['ticketId'] ?? 'TKT-LIVE').toString();
    final ticketId = rawId.length > 14 ? 'TKT-${rawId.substring(0, 8).toUpperCase()}' : rawId.toUpperCase();
    final reason = (data['reason'] ?? data['title'] ?? 'Trip Assistance Request').toString();
    final description = (data['description'] ?? 'Your issue ticket is logged in the AdhocX support system.').toString();
    final createdTime = _formatDateTime(data['createdAt'] as String?);
    final updatedTime = _formatDateTime(data['updatedAt'] as String? ?? data['createdAt'] as String?);

    final resolution = data['resolution']?.toString() ??
        'Your dispute has been reviewed and resolved by our customer operations team.';

    final updates = [
      {'time': createdTime != '—' ? createdTime : 'Recently', 'text': 'Our operations team has received your ticket.'},
      if (_currentState != TicketStatusState.open) ...[
        {'time': updatedTime != '—' ? updatedTime : 'In Progress', 'text': 'Our support team is actively reviewing the trip telemetry and details.'},
      ],
      if (_currentState == TicketStatusState.resolved) ...[
        {'time': 'Resolved', 'text': resolution},
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
                        backgroundColor: isDark ? AppColors.surfaceDark : AppColors.slate200,
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
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(ticketId, style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 2),
                              Text(reason, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                              if (createdTime != '—')
                                Text(createdTime, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
                            ],
                          ),
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
                            Icon(Icons.check_circle_outline, color: AppColors.success, size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    resolution,
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(updatedTime, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
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
                          _buildRow(context, 'Issue', reason, isDark),
                          const Divider(),
                          _buildRow(context, 'Details', description, isDark),
                          const Divider(),
                          _buildRow(context, 'Status', _getLabel(_currentState), isDark, colorOverride: _getColor(_currentState)),
                          const Divider(),
                          _buildRow(context, 'Last Updated', updatedTime, isDark),
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
                                Icon(Icons.circle, size: 10, color: AppColors.primary),
                                if (!isLast) Container(width: 2, height: 44, color: AppColors.slate300),
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
                                    color: AppColors.primary,
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
        return AppColors.warning;
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
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActions(BuildContext context) {
    if (_currentState == TicketStatusState.resolved) {
      return AppPrimaryButton(
        text: 'Close Ticket',
        onPressed: () => context.go(AppRoutes.userSupportCenterScreen),
      );
    }

    return OutlinedButton(
      onPressed: () {
        context.pop();
      },
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        foregroundColor: AppColors.primary,
        side: BorderSide(color: AppColors.primary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
      ),
      child: const Text('Back to Support', style: TextStyle(fontWeight: FontWeight.bold)),
    );
  }
}
