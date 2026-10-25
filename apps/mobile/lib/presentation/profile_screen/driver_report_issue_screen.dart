import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../core/utils/app_logger.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/language_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_profile_avatar.dart';

class DriverReportIssueScreen extends StatefulWidget {
  final String? initialTripId;
  final List<dynamic>? initialIssues;
  const DriverReportIssueScreen({super.key, this.initialTripId, this.initialIssues});

  @override
  State<DriverReportIssueScreen> createState() => _DriverReportIssueScreenState();
}

class _DriverReportIssueScreenState extends State<DriverReportIssueScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Form Fields
  String _selectedCategory = 'Trip & Booking Dispute';
  final List<String> _categories = [
    'Trip & Booking Dispute',
    'Earnings & Withdrawal Payout',
    'KYC, Documents & Compliance',
    'Vehicle Assignment & Spec',
    'App Performance / Technical Glitch',
    'Passenger Behavior / Road Incident',
    'Other General Operational Query',
  ];

  String _selectedPriority = 'NORMAL';
  final List<Map<String, String>> _priorities = [
    {'id': 'NORMAL', 'label': 'Normal (24h Standard SLA)'},
    {'id': 'HIGH', 'label': 'High (4h Priority Review)'},
    {'id': 'URGENT', 'label': 'Urgent (Immediate Ops Triage)'},
  ];

  final TextEditingController _subjectController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _tripIdController = TextEditingController();

  bool _isSubmitting = false;
  bool _isLoadingHistory = false;
  List<dynamic> _myIssues = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    if (widget.initialTripId != null && widget.initialTripId!.isNotEmpty) {
      _tripIdController.text = widget.initialTripId!;
    }
    if (widget.initialIssues != null) {
      _myIssues = widget.initialIssues!;
      _isLoadingHistory = false;
    } else {
      _loadHistory();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _subjectController.dispose();
    _descriptionController.dispose();
    _tripIdController.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoadingHistory = true);
    try {
      final issues = await DriverService.instance.getMySupportQueries();
      if (mounted) {
        setState(() {
          _myIssues = issues;
          _isLoadingHistory = false;
        });
      }
    } catch (e) {
      AppLogger.error('Failed to load driver reported issues: $e', tag: 'SUPPORT');
      if (mounted) {
        setState(() => _isLoadingHistory = false);
      }
    }
  }

  Future<void> _handleSubmit() async {
    final subject = _subjectController.text.trim();
    final description = _descriptionController.text.trim();
    final tripId = _tripIdController.text.trim();

    if (subject.isEmpty) {
      Fluttertoast.showToast(msg: 'Please enter an issue subject');
      return;
    }

    if (description.isEmpty || description.length < 10) {
      Fluttertoast.showToast(msg: 'Please provide detailed description (minimum 10 characters)');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final user = AuthService.instance.currentUser;
      final driverName = user?.fullName ?? 'Driver';
      final phone = user?.phone ?? '';

      final res = await DriverService.instance.submitSupportQuery(
        category: _selectedCategory,
        subject: subject,
        description: description,
        tripId: tripId.isNotEmpty ? tripId : null,
        priority: _selectedPriority,
        contactPerson: driverName,
        contactPhone: phone,
        contactEmail: user?.email,
      );

      AppLogger.info('Driver support issue submitted successfully: $res', tag: 'SUPPORT');

      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Issue reported successfully! Our operations desk has received your ticket.',
          backgroundColor: AppColors.success,
          textColor: Colors.white,
          toastLength: Toast.LENGTH_LONG,
        );

        _subjectController.clear();
        _descriptionController.clear();
        _tripIdController.clear();
        setState(() {
          _isSubmitting = false;
          _selectedCategory = _categories.first;
          _selectedPriority = 'NORMAL';
        });

        // Refresh history and switch to My Reported Issues tab
        await _loadHistory();
        _tabController.animateTo(1);
      }
    } catch (e) {
      AppLogger.error('Error submitting driver support issue: $e', tag: 'SUPPORT', error: e);
      if (mounted) {
        setState(() => _isSubmitting = false);
        Fluttertoast.showToast(
          msg: 'Failed to submit issue report. Please check your connection and try again.',
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.helpSupportScreen);
                          }
                        },
                        icon: Icon(
                          Icons.arrow_back,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          context.tr('Report an Issue'),
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Tab Bar ──────────────────────────────────────────────────
                Container(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  child: TabBar(
                    controller: _tabController,
                    indicatorColor: isDark ? AppColors.primaryLight : AppColors.primary,
                    indicatorWeight: 3,
                    labelPadding: const EdgeInsets.symmetric(horizontal: 6),
                    labelColor: isDark ? AppColors.primaryLight : AppColors.primary,
                    unselectedLabelColor: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                    unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
                    tabs: [
                      Tab(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(context.tr('Report an Issue'), maxLines: 1),
                        ),
                      ),
                      Tab(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text('My Issues (${_myIssues.length})', maxLines: 1),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Tab Views ────────────────────────────────────────────────
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildReportFormTab(isDark),
                      _buildHistoryTab(isDark),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildReportFormTab(bool isDark) {
    final user = AuthService.instance.currentUser;
    final driverName = user?.fullName ?? 'Driver';
    final driverPhone = user?.phone ?? '—';

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        // ── Info Notice Card ─────────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(
              color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.2),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                Icons.info_outline_rounded,
                color: isDark ? AppColors.primaryLight : AppColors.primary,
                size: 20,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Reported issues are directly monitored and resolved by our 24/7 Operations Helpdesk in the central admin dispatch.',
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),

        // ── Driver Contact Info Card ─────────────────────────────────────────
        Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
          child: Row(
            children: [
              AppProfileAvatar(
                radius: 18,
                name: driverName,
                isDark: isDark,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      driverName,
                      style: AppTypography.body(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Phone: $driverPhone • Verified Driver',
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),

        // ── Issue Category Selector ──────────────────────────────────────────
        _buildFieldLabel('Issue Category', isDark),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedCategory,
              isExpanded: true,
              dropdownColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              icon: Icon(Icons.keyboard_arrow_down, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
              items: _categories.map((cat) {
                return DropdownMenuItem(
                  value: cat,
                  child: Text(
                    cat,
                    style: TextStyle(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontSize: 13,
                    ),
                  ),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) setState(() => _selectedCategory = val);
              },
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),

        // ── Priority Level ───────────────────────────────────────────────────
        _buildFieldLabel('Urgency / Priority', isDark),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedPriority,
              isExpanded: true,
              dropdownColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              icon: Icon(Icons.keyboard_arrow_down, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
              items: _priorities.map((p) {
                return DropdownMenuItem(
                  value: p['id'],
                  child: Text(
                    p['label']!,
                    style: TextStyle(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontSize: 13,
                    ),
                  ),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) setState(() => _selectedPriority = val);
              },
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),

        // ── Associated Trip ID (Optional) ────────────────────────────────────
        _buildFieldLabel('Related Trip ID (Optional)', isDark),
        const SizedBox(height: 6),
        _buildTextField(
          controller: _tripIdController,
          hint: 'e.g. TRP-10492 or leave blank',
          isDark: isDark,
        ),
        const SizedBox(height: AppSpacing.md),

        // ── Subject ──────────────────────────────────────────────────────────
        _buildFieldLabel('Subject / Short Summary', isDark),
        const SizedBox(height: 6),
        _buildTextField(
          controller: _subjectController,
          hint: 'e.g. Payout not credited to wallet after completed trip',
          isDark: isDark,
        ),
        const SizedBox(height: AppSpacing.md),

        // ── Description ──────────────────────────────────────────────────────
        _buildFieldLabel('Detailed Description', isDark),
        const SizedBox(height: 6),
        _buildTextField(
          controller: _descriptionController,
          hint: 'Please provide full details of what happened, time of incident, route, or error messages encountered...',
          isDark: isDark,
          maxLines: 5,
        ),
        const SizedBox(height: AppSpacing.xl),

        // ── Submit Button ────────────────────────────────────────────────────
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: _isSubmitting ? null : _handleSubmit,
            style: ElevatedButton.styleFrom(
              backgroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
            ),
            child: _isSubmitting
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.send_rounded, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Submit Issue to Admin Desk',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
          ),
        ),
        const SizedBox(height: AppSpacing.xxl),
      ],
    );
  }

  Widget _buildHistoryTab(bool isDark) {
    if (_isLoadingHistory) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_myIssues.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.assignment_turned_in_outlined,
                size: 56,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'No Reported Issues Yet',
                style: AppTypography.h3(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'When you report operational issues or ride disputes, their live review status and admin resolutions will appear here.',
                textAlign: TextAlign.center,
                style: AppTypography.body(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              ElevatedButton.icon(
                onPressed: () => _tabController.animateTo(0),
                icon: const Icon(Icons.add_circle_outline, size: 18),
                label: const Text('File a New Report'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadHistory,
      child: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.lg),
        itemCount: _myIssues.length,
        itemBuilder: (context, index) {
          final issue = _myIssues[index];
          final id = issue['id']?.toString() ?? 'TKT';
          final category = issue['category']?.toString() ?? 'General';
          final subject = issue['subject']?.toString() ?? issue['reason']?.toString() ?? 'Support Request';
          final description = issue['description']?.toString() ?? '';
          final status = (issue['status']?.toString() ?? 'PENDING').toUpperCase();
          final resolutionText = issue['resolutionText']?.toString();
          final createdAt = issue['createdAt']?.toString() ?? '';

          Color statusBg;
          Color statusText;
          String statusLabel = status;
          if (status == 'RESOLVED') {
            statusBg = Colors.green.withValues(alpha: 0.15);
            statusText = Colors.green;
            statusLabel = 'RESOLVED';
          } else if (status == 'UNDER_REVIEW' || status == 'IN_REVIEW') {
            statusBg = Colors.blue.withValues(alpha: 0.15);
            statusText = Colors.blue;
            statusLabel = 'UNDER REVIEW';
          } else {
            statusBg = Colors.orange.withValues(alpha: 0.15);
            statusText = Colors.orange.shade800;
            statusLabel = 'PENDING OPS';
          }

          return Container(
            margin: const EdgeInsets.only(bottom: AppSpacing.md),
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '#${id.length > 8 ? id.substring(0, 8).toUpperCase() : id}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusBg,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        statusLabel,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: statusText),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  subject,
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  category,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
                if (description.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    description,
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                    ),
                  ),
                ],
                if (resolutionText != null && resolutionText.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      border: Border.all(color: Colors.green.withValues(alpha: 0.2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.check_circle, size: 14, color: Colors.green),
                            SizedBox(width: 6),
                            Text(
                              'Admin Resolution Note:',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          resolutionText,
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if (createdAt.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Submitted: ${createdAt.substring(0, 10)}',
                    style: AppTypography.micro(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildFieldLabel(String label, bool isDark) {
    return Text(
      label,
      style: AppTypography.caption(
        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required bool isDark,
    int maxLines = 1,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: TextField(
        controller: controller,
        maxLines: maxLines,
        style: TextStyle(
          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          fontSize: 13,
        ),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            fontSize: 13,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        ),
      ),
    );
  }
}
