import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Request Details & Tracking backed by GET /corporate/support/tickets/:id.
class RequestDetailsTrackingScreen extends StatefulWidget {
  const RequestDetailsTrackingScreen({super.key});

  @override
  State<RequestDetailsTrackingScreen> createState() =>
      _RequestDetailsTrackingScreenState();
}

class _RequestDetailsTrackingScreenState
    extends State<RequestDetailsTrackingScreen> {
  Map<String, dynamic>? _ticket;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadTicket());
  }

  Future<void> _loadTicket() async {
    Map<String, dynamic>? initial;
    String? ticketId;
    try {
      final extra = GoRouterState.of(context).extra;
      if (extra is Map) {
        initial = Map<String, dynamic>.from(extra);
        ticketId = initial['id']?.toString() ?? initial['ticketId']?.toString();
      } else if (extra is String && extra.isNotEmpty) {
        ticketId = extra;
      }
    } catch (_) {}

    final data = maybeEmployeeData(context);
    if (data != null) {
      if (ticketId == null || ticketId.isEmpty) {
        final tickets = await data.loadTickets();
        if (tickets.isNotEmpty) {
          initial = tickets.first;
          ticketId = initial['id']?.toString();
        }
      }
      if (ticketId != null && ticketId.isNotEmpty) {
        try {
          final detailed = await data.repository.getTicketDetails(ticketId);
          initial = detailed;
        } catch (_) {}
      }
    }

    if (mounted) {
      setState(() {
        _ticket = initial;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const EmployeeLoadingScaffold(
        appBar: EmployeeAppBar(title: 'Request Details'),
        skeletonLayout: SkeletonLayout.tickets,
      );
    }
    final p = EmployeePalette.of(context);
    final ticket = _ticket;

    if (ticket == null) {
      return Scaffold(
        backgroundColor: p.background,
        appBar: const EmployeeAppBar(title: 'Request Details'),
        body: const SafeArea(
          child: EmployeeEmptyState(
            icon: Icons.confirmation_number_outlined,
            title: 'No ticket selected',
            description: 'Submit a support ticket or select one from My Requests.',
          ),
        ),
      );
    }

    final ticketId = ticket['id']?.toString() ?? '';
    final ticketCode = ticket['ticketNumber']?.toString() ??
        (ticketId.length > 8
            ? ticketId.substring(0, 8).toUpperCase()
            : ticketId);
    final subject = ticket['subject']?.toString() ??
        (ticket['category']?.toString() ?? 'Support Request')
            .replaceAll('_', ' ');
    final statusRaw = (ticket['status'] ?? 'OPEN').toString().toUpperCase();
    final statusLabel = statusRaw.replaceAll('_', ' ');
    final createdAt = [
      EmployeeDataProvider.formatDisplayDate(ticket['createdAt']?.toString()),
      EmployeeDataProvider.formatDisplayTime(ticket['createdAt']?.toString()),
    ].where((s) => s.isNotEmpty).join(', ');
    final description = ticket['description']?.toString() ?? '';
    final resolutionNotes = ticket['resolutionNotes']?.toString().trim() ?? '';
    final isResolved = statusRaw == 'RESOLVED' || statusRaw == 'CLOSED';
    final isInProgress = statusRaw == 'IN_PROGRESS' ||
        statusRaw == 'WAITING_FOR_CORPORATE' ||
        statusRaw == 'ASSIGNED';

    Widget meta(String label, String value) => Row(
          children: [
            Text(label, style: AppTypography.caption(color: p.textMuted)),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                value,
                textAlign: TextAlign.end,
                style: AppTypography.small(
                  color: p.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Request Details'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.pageHorizontal,
            vertical: AppSpacing.lg,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: p.accentTint,
                            borderRadius: AppRadius.borderLg,
                          ),
                          child: Icon(Icons.flag_rounded,
                              color: p.accent, size: 20),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Text(
                            subject,
                            style: AppTypography.h4(
                              color: p.textPrimary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        EmployeeStatusBadge.fromString(statusLabel),
                      ],
                    ),
                    Divider(color: p.border, height: AppSpacing.xxl),
                    if (ticketCode.isNotEmpty) ...[
                      meta('Request ID', ticketCode),
                      const SizedBox(height: AppSpacing.sm),
                    ],
                    if (createdAt.isNotEmpty) ...[
                      meta('Created On', createdAt),
                      const SizedBox(height: AppSpacing.sm),
                    ],
                    meta(
                      'Category',
                      (ticket['category'] ?? 'GENERAL_SUPPORT')
                          .toString()
                          .replaceAll('_', ' '),
                    ),
                    if (description.isNotEmpty) ...[
                      Divider(color: p.border, height: AppSpacing.xxl),
                      Text(
                        'Description',
                        style: AppTypography.caption(
                          color: p.textMuted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        description,
                        style: AppTypography.body(color: p.textPrimary),
                      ),
                    ],
                    if (resolutionNotes.isNotEmpty) ...[
                      Divider(color: p.border, height: AppSpacing.xxl),
                      Text(
                        'Resolution Notes',
                        style: AppTypography.caption(
                          color: p.textMuted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        resolutionNotes,
                        style: AppTypography.body(color: p.textPrimary),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              TripSectionCard(
                title: 'Ticket Progress',
                child: TripTimeline(
                  dotSize: 18,
                  entries: [
                    TripTimelineEntry(
                      dotColor: AppColors.success,
                      dotChild:
                          const Icon(Icons.check, size: 12, color: Colors.white),
                      title: 'Request Received',
                      subtitle: createdAt.isNotEmpty ? createdAt : 'Submitted',
                    ),
                    TripTimelineEntry(
                      dotColor: isResolved
                          ? AppColors.success
                          : (isInProgress ? AppColors.primary : p.border),
                      dotChild: isResolved
                          ? const Icon(Icons.check,
                              size: 12, color: Colors.white)
                          : Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                            ),
                      title: 'Under Review',
                      emphasise: !isResolved,
                      subtitle: 'Our support desk is reviewing your request.',
                    ),
                    TripTimelineEntry(
                      dotColor: isResolved ? AppColors.success : p.border,
                      dotChild: isResolved
                          ? const Icon(Icons.check,
                              size: 12, color: Colors.white)
                          : null,
                      title: 'Resolution Update',
                      subtitle: resolutionNotes.isNotEmpty
                          ? resolutionNotes
                          : (isResolved
                              ? 'This request has been resolved.'
                              : "You'll be notified once it's resolved."),
                    ),
                  ],
                ),
              ),
              if (ticketId.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.xl),
                EmployeePrimaryButton(
                  label: 'Open Support Chat',
                  icon: Icons.chat_bubble_outline_rounded,
                  onPressed: () => context.push(
                    AppRoutes.liveSupportChat,
                    extra: ticketId,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
