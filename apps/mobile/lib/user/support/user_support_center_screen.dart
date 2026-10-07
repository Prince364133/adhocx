import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserSupportCenterScreen extends StatefulWidget {
  const UserSupportCenterScreen({super.key});

  @override
  State<UserSupportCenterScreen> createState() => _UserSupportCenterScreenState();
}

class _UserSupportCenterScreenState extends State<UserSupportCenterScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();

  List<Map<String, dynamic>> _myTickets = [];
  bool _isLoadingTickets = true;
  String _searchQuery = '';

  final List<Map<String, String>> _faqs = [
    {
      'category': 'Corporate Booking',
      'q': 'How do corporate ride requirements work?',
      'a': 'You can create single or bulk vehicle requirements specifying pickup, drop, vehicle type, and reporting time. Verified fleet drivers receive dispatches or bid on your requirements under your corporate rate card.',
    },
    {
      'category': 'Corporate Booking',
      'q': 'Can we schedule recurring daily employee commutes?',
      'a': 'Yes, use the Bulk Posting feature under the Requirements tab to schedule daily shifts, multiple pickup points, and dedicated vehicle fleets across chosen dates.',
    },
    {
      'category': 'Billing & GST',
      'q': 'How do I download monthly GST tax invoices?',
      'a': 'All completed rides generate digital invoices. At the end of every calendar month, a consolidated GST tax invoice with your company GSTIN is automatically compiled and emailed to your registered billing email.',
    },
    {
      'category': 'Billing & GST',
      'q': 'What payment modes are supported for enterprise bookings?',
      'a': 'We support prepaid corporate wallet top-ups via Razorpay (Corporate Cards, NetBanking, UPI), and post-paid credit facilities with dedicated escrow limits for verified corporate accounts.',
    },
    {
      'category': 'Driver & Safety',
      'q': 'What screening do drivers undergo?',
      'a': 'All AdhocX drivers must pass background verification, mandatory commercial Driving License validation, vehicle RC fitness, commercial insurance, and pollution certification prior to dispatch.',
    },
    {
      'category': 'Driver & Safety',
      'q': 'What happens if a vehicle breaks down during an active trip?',
      'a': 'Our 24/7 Operations Hub immediately triggers an automated emergency backup vehicle replacement or roadside assistance through the active trip SOS protocol.',
    },
    {
      'category': 'Company Account',
      'q': 'How do I update our registered company address or GSTIN?',
      'a': 'Navigate to Profile > Company Information to update your registered office address, GSTIN, and business details. Updates are reviewed by our verification team.',
    },
    {
      'category': 'Tariffs & Pricing',
      'q': 'Where can I see our corporate tariffs and rate cards?',
      'a': 'Click "Corporate Rate Card & Tariffs" on your Profile screen to inspect fixed zone-to-zone tariffs, per-km rates, night shift allowances, and escort security charges.',
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadMyTickets();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadMyTickets() async {
    setState(() => _isLoadingTickets = true);
    try {
      final tickets = await UserService.instance.getMySupportQueries();
      if (mounted) {
        setState(() {
          _myTickets = tickets.whereType<Map<String, dynamic>>().toList();
          _isLoadingTickets = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingTickets = false);
    }
  }

  Future<void> _callHelpline(String phone) async {
    final uri = Uri.parse('tel:${phone.replaceAll(' ', '')}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      Fluttertoast.showToast(msg: 'Unable to open dialer');
    }
  }

  Future<void> _emailSupport(String email) async {
    final uri = Uri.parse('mailto:$email?subject=AdhocX%20Enterprise%20Support%20Request');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      Fluttertoast.showToast(msg: 'Unable to open mail client');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final filteredFaqs = _searchQuery.isEmpty
        ? _faqs
        : _faqs.where((f) {
            final q = _searchQuery.toLowerCase();
            return f['q']!.toLowerCase().contains(q) ||
                f['a']!.toLowerCase().contains(q) ||
                f['category']!.toLowerCase().contains(q);
          }).toList();

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
          'Support Center',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _loadMyTickets,
            icon: Icon(Icons.refresh, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
            tooltip: 'Refresh tickets',
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Purple Header Banner & Search Box
            Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 4),
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryLight],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(AppRadius.lg),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.headset_mic_rounded, color: Colors.white, size: 28),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'AdhocX Corporate Helpdesk',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    '24/7 dedicated dispatch operations & corporate ticket resolution.',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val.trim()),
                    style: const TextStyle(fontSize: 13, color: AppColors.slate900),
                    decoration: InputDecoration(
                      hintText: 'Search help topics, GST billing, trips...',
                      hintStyle: const TextStyle(fontSize: 12, color: AppColors.slate400),
                      prefixIcon: const Icon(Icons.search, color: AppColors.slate400),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18, color: AppColors.slate500),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      fillColor: Colors.white,
                      filled: true,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(vertical: 0),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 10),

            // Primary Quick Action Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              child: Row(
                children: [
                  Expanded(
                    flex: 5,
                    child: ElevatedButton.icon(
                      onPressed: () => context.push(AppRoutes.userRaiseIssueScreen).then((_) => _loadMyTickets()),
                      icon: const Icon(Icons.add_comment_outlined, size: 18),
                      label: const Text('Raise a Support Query', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        elevation: 0,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filledTonal(
                    onPressed: () => _callHelpline('+917893545818'),
                    icon: const Icon(Icons.phone_in_talk, size: 20),
                    tooltip: 'Call Support Helpline (7893545818)',
                  ),
                  const SizedBox(width: 4),
                  IconButton.filledTonal(
                    onPressed: () => _emailSupport('support@adhocx.com'),
                    icon: const Icon(Icons.email_outlined, size: 20),
                    tooltip: 'Email Operations Desk (support@adhocx.com)',
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Tab Bar
            Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  color: AppColors.primary,
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                labelColor: Colors.white,
                unselectedLabelColor: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                tabs: [
                  Tab(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.receipt_long_outlined, size: 16),
                        const SizedBox(width: 6),
                        Text('My Tickets (${_myTickets.length})'),
                      ],
                    ),
                  ),
                  const Tab(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.help_outline, size: 16),
                        SizedBox(width: 6),
                        Text('Help & FAQs'),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // Tab Views
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // TAB 1: My Support Tickets
                  _buildMyTicketsTab(isDark),

                  // TAB 2: Knowledge Base & FAQs
                  _buildFaqTab(filteredFaqs, isDark),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMyTicketsTab(bool isDark) {
    if (_isLoadingTickets) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_myTickets.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.inbox_outlined, size: 48, color: AppColors.primary),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'No Support Tickets Raised Yet',
                style: AppTypography.h3(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Have a question about billing, booking requirements, or driver quality? Tap "Raise a Support Query" above to notify our operations team.',
                textAlign: TextAlign.center,
                style: AppTypography.body(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: _myTickets.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final ticket = _myTickets[index];
        final id = ticket['id']?.toString() ?? 'TKT';
        final shortId = id.length > 8 ? id.substring(0, 8).toUpperCase() : id.toUpperCase();
        final category = ticket['category']?.toString() ?? 'Support Query';
        final subject = ticket['subject']?.toString() ?? ticket['reason']?.toString() ?? 'Inquiry';
        final description = ticket['description']?.toString() ?? '';
        final status = (ticket['status'] ?? 'PENDING').toString().toUpperCase();
        final resolution = ticket['resolutionText']?.toString();
        final createdAt = ticket['createdAt']?.toString();

        Color statusColor;
        String statusLabel;
        if (status == 'RESOLVED' || status == 'CLOSED') {
          statusColor = AppColors.success;
          statusLabel = 'RESOLVED';
        } else if (status == 'UNDER_REVIEW' || status == 'IN_PROGRESS') {
          statusColor = Colors.blue;
          statusLabel = 'UNDER REVIEW';
        } else {
          statusColor = AppColors.warning;
          statusLabel = 'PENDING';
        }

        return Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: statusColor.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Ticket Header: ID & Status
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Text(
                          '#$shortId',
                          style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.primary),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        category,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Text(
                      statusLabel,
                      style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Subject
              Text(
                subject,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 4),

              // Description
              Text(
                description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.caption(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),

              // Admin Operator Resolution Note
              if (resolution != null && resolution.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: statusColor.withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.admin_panel_settings, size: 14, color: statusColor),
                          const SizedBox(width: 4),
                          Text(
                            'Admin Resolution Note:',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: statusColor),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        resolution,
                        style: TextStyle(fontSize: 12, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    createdAt != null ? DateTime.tryParse(createdAt)?.toLocal().toString().split('.').first ?? '' : '',
                    style: const TextStyle(fontSize: 10, color: AppColors.slate400),
                  ),
                  TextButton(
                    onPressed: () {
                      context.push(
                        status == 'RESOLVED'
                            ? AppRoutes.userTicketDetailsResolvedScreen
                            : (status == 'UNDER_REVIEW' ? AppRoutes.userTicketDetailsInProgressScreen : AppRoutes.userTicketDetailsOpenScreen),
                        extra: ticket,
                      );
                    },
                    style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(50, 24)),
                    child: const Text('View Full Ticket →', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFaqTab(List<Map<String, String>> faqs, bool isDark) {
    if (faqs.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Text(
            'No help articles found for "$_searchQuery"',
            style: AppTypography.body(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: faqs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final item = faqs[index];
        return Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
          child: ExpansionTile(
            tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
            leading: const Icon(Icons.help_outline, color: AppColors.primary, size: 20),
            title: Text(
              item['q']!,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              ),
            ),
            subtitle: Text(
              item['category']!,
              style: TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.bold),
            ),
            childrenPadding: const EdgeInsets.only(left: 16, right: 16, bottom: 14),
            children: [
              Text(
                item['a']!,
                style: TextStyle(
                  fontSize: 12,
                  height: 1.5,
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
