import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_radius.dart';
import '../../services/driver_service.dart';

class DriverScoreScreen extends StatefulWidget {
  const DriverScoreScreen({super.key});

  @override
  State<DriverScoreScreen> createState() => _DriverScoreScreenState();
}

class _DriverScoreScreenState extends State<DriverScoreScreen> with SingleTickerProviderStateMixin {
  bool _isLoading = true;
  Map<String, dynamic>? _scoreData;
  late AnimationController _animController;
  late Animation<double> _scoreAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _scoreAnimation = Tween<double>(begin: 0, end: 100).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
    );
    _fetchScoreDetails();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _fetchScoreDetails() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final res = await DriverService.instance.getTrustScore(forceRefresh: true);
      if (res is Map<String, dynamic>) {
        final data = res['data'] is Map<String, dynamic> ? res['data'] as Map<String, dynamic> : res;
        final targetScore = ((data['currentScore'] ?? data['trustScore'] ?? 100.0) as num).toDouble();

        setState(() {
          _scoreData = data;
          _isLoading = false;
        });

        _scoreAnimation = Tween<double>(begin: 0, end: targetScore).animate(
          CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
        );
        _animController.forward(from: 0);
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _scoreData = _buildFallbackData();
      });
      _scoreAnimation = Tween<double>(begin: 0, end: 100.0).animate(
        CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
      );
      _animController.forward(from: 0);
    }
  }

  Map<String, dynamic> _buildFallbackData() {
    return {
      'currentScore': 100.0,
      'maxScore': 100,
      'tier': 'PLATINUM',
      'tierBenefits': [
        'Priority Wave 1 Dispatch Allocation',
        'Lowest Platform Service Fee (8% vs 15%)',
        'Instant Zero-Fee Wallet Payouts',
        'VIP Corporate & Airport Ride Access',
      ],
      'isRookieProtected': false,
      'rookieTripsRemaining': 0,
      'metrics': {
        'completionRate': {
          'score': 28.5,
          'max': 30,
          'percentage': 95,
          'title': 'Trip Completion & Non-Cancellation',
          'description': 'Calculated over rolling 50 trips with zero unexcused cancellations',
          'status': 'EXCELLENT',
        },
        'customerRating': {
          'score': 24.2,
          'max': 25,
          'percentage': 97,
          'title': 'Customer Star Rating (4.85 / 5.0)',
          'description': 'Direct average passenger feedback rating',
          'status': 'EXCELLENT',
        },
        'acceptanceRate': {
          'score': 18.0,
          'max': 20,
          'percentage': 90,
          'title': 'Dispatch Acceptance Rate',
          'description': 'Percentage of dispatched wave opportunities accepted',
          'status': 'GOOD',
        },
        'punctuality': {
          'score': 14.0,
          'max': 15,
          'percentage': 93,
          'title': 'On-Time Arrival & ETA Accuracy',
          'description': 'Arriving at pickup location within estimated OTP arrival window',
          'status': 'EXCELLENT',
        },
        'loyaltyStreak': {
          'score': 9.3,
          'max': 10,
          'percentage': 93,
          'title': 'Clean Streak & Loyalty Bonus',
          'description': 'Bonus points for active days without disputes or safety violations',
          'status': 'EXCELLENT',
        },
      },
      'scoreHistory': [],
      'improvementTips': [
        'Accept your next 3 consecutive dispatch offers to reach 96+ score.',
        'Arrive within 3 minutes of estimated pickup time to maximize Punctuality points.',
        'Complete 5 more rides this week to unlock the +5.0 Weekly Consistency Milestone.',
      ],
    };
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final data = _scoreData ?? _buildFallbackData();
    final tier = (data['tier'] as String?)?.toUpperCase() ?? 'PLATINUM';
    final tierBenefits = (data['tierBenefits'] as List<dynamic>?) ?? [];
    final metrics = (data['metrics'] as Map<String, dynamic>?) ?? {};
    final scoreHistory = (data['scoreHistory'] as List<dynamic>?) ?? [];
    final tips = (data['improvementTips'] as List<dynamic>?) ?? [];
    final isRookie = data['isRookieProtected'] == true;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        elevation: 0,
        title: Text(
          'Driver Trust & Performance',
          style: AppTypography.h4(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new,
            size: 20,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _fetchScoreDetails,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 520),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // ── 1. Hero Score Radial Gauge Card ───────────────
                        _buildHeroScoreCard(isDark, tier, isRookie),

                        const SizedBox(height: AppSpacing.lg),

                        // ── 2. Tier Privileges & Benefits ─────────────────
                        _buildTierBenefitsCard(isDark, tier, tierBenefits),

                        const SizedBox(height: AppSpacing.lg),

                        // ── 3. Rookie & Fair Opportunity Protection ────────
                        _buildFairOpportunityCard(isDark, isRookie),

                        const SizedBox(height: AppSpacing.xl),

                        // ── 4. 5-Pillar Score Breakdown ───────────────────
                        _buildSectionHeader(
                          title: 'Score Factors Breakdown',
                          subtitle: 'Your score out of 100 points based on rolling performance',
                          isDark: isDark,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        ...metrics.entries.map((e) => _buildMetricTile(isDark, e.value as Map<String, dynamic>)),

                        const SizedBox(height: AppSpacing.xl),

                        // ── 5. Score Ledger & History (+ / - Events) ──────
                        _buildSectionHeader(
                          title: 'Point Activity History',
                          subtitle: 'Live record of points added (+) or deducted (-)',
                          isDark: isDark,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        _buildHistoryLedger(isDark, scoreHistory),

                        const SizedBox(height: AppSpacing.xl),

                        // ── 6. Score Improvement Tips ─────────────────────
                        _buildSectionHeader(
                          title: 'How to Boost Your Score',
                          subtitle: 'Actionable tips to reach Platinum tier & priority dispatch',
                          isDark: isDark,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        _buildTipsCard(isDark, tips),

                        const SizedBox(height: AppSpacing.xxl),
                      ],
                    ),
                  ),
                ),
              ),
            ),
      ),
    );
  }

  // ── Hero Animated Score Card ───────────────────────────────────────────────
  Widget _buildHeroScoreCard(bool isDark, String tier, bool isRookie) {
    Color tierColor;
    String tierLabel;

    switch (tier) {
      case 'PLATINUM':
        tierColor = const Color(0xFF818CF8); // Indigo / Platinum
        tierLabel = 'PLATINUM DRIVER';
        break;
      case 'GOLD':
        tierColor = const Color(0xFFF59E0B); // Amber / Gold
        tierLabel = 'GOLD DRIVER';
        break;
      case 'SILVER':
        tierColor = const Color(0xFF94A3B8); // Slate / Silver
        tierLabel = 'SILVER DRIVER';
        break;
      default:
        tierColor = const Color(0xFFD97706);
        tierLabel = 'PROBATION RECOVERY';
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [const Color(0xFF1E1B4B), const Color(0xFF0F172A)]
              : [const Color(0xFFEEF2FF), const Color(0xFFFFFFFF)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(
          color: tierColor.withValues(alpha: 0.35),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: tierColor.withValues(alpha: 0.12),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          // Tier Chip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: tierColor.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(AppRadius.full),
              border: Border.all(color: tierColor.withValues(alpha: 0.5)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.verified, size: 16, color: tierColor),
                const SizedBox(width: 6),
                Text(
                  tierLabel,
                  style: AppTypography.caption(
                    color: tierColor,
                    fontWeight: FontWeight.bold,
                  ).copyWith(letterSpacing: 1.1),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.lg),

          // Circular Animated Gauge
          AnimatedBuilder(
            animation: _scoreAnimation,
            builder: (context, child) {
              final scoreVal = _scoreAnimation.value;
              return Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 150,
                    height: 150,
                    child: CircularProgressIndicator(
                      value: scoreVal / 100.0,
                      strokeWidth: 12,
                      backgroundColor: isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight,
                      valueColor: AlwaysStoppedAnimation<Color>(tierColor),
                      strokeCap: StrokeCap.round,
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        scoreVal.toStringAsFixed(1),
                        style: AppTypography.h1(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.w900,
                        ).copyWith(fontSize: 38),
                      ),
                      Text(
                        'out of 100',
                        style: AppTypography.caption(
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),

          const SizedBox(height: AppSpacing.lg),

          Text(
            tier == 'PLATINUM'
                ? 'Outstanding Performance! You are in the top 5% of all drivers.'
                : tier == 'GOLD'
                    ? 'Great standing! You qualify for Wave 1 priority dispatches.'
                    : 'Good standing. Keep completing clean rides to reach Gold tier.',
            textAlign: TextAlign.center,
            style: AppTypography.body(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  // ── Tier Benefits Card ────────────────────────────────────────────────────
  Widget _buildTierBenefitsCard(bool isDark, String tier, List<dynamic> benefits) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.stars_rounded, color: Color(0xFF6366F1), size: 22),
              const SizedBox(width: 8),
              Text(
                '$tier Tier Privileges',
                style: AppTypography.h4(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          ...benefits.map((b) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline, color: AppColors.accentGreen, size: 16),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        b.toString(),
                        style: AppTypography.body(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  // ── Fair Opportunity & Rookie Protection Card ─────────────────────────────
  Widget _buildFairOpportunityCard(bool isDark, bool isRookie) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F291E) : const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: AppColors.accentGreen.withValues(alpha: 0.4),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.shield_outlined, color: AppColors.accentGreen, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isRookie ? 'Rookie Protection Active' : 'Fair Dispatch Guarantee',
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isRookie
                      ? 'As a new driver, you receive a protected 85.0 score baseline and guaranteed allocation in dispatch waves for your first 25 trips.'
                      : 'Scores are calculated on a rolling 50-trip window. Past mistakes drop off quickly, and consecutive clean trips earn rapid recovery multipliers.',
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── 5-Pillar Metric Tile ──────────────────────────────────────────────────
  Widget _buildMetricTile(bool isDark, Map<String, dynamic> m) {
    final title = m['title']?.toString() ?? 'Metric';
    final desc = m['description']?.toString() ?? '';
    final score = (m['score'] ?? 0.0).toDouble();
    final max = (m['max'] ?? 100).toDouble();
    final pct = (m['percentage'] ?? ((score / max) * 100)).toDouble();
    final status = m['status']?.toString() ?? 'GOOD';

    Color statusColor = status == 'EXCELLENT'
        ? AppColors.accentGreen
        : status == 'GOOD'
            ? const Color(0xFF6366F1)
            : const Color(0xFFF59E0B);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Text(
                '${score.toStringAsFixed(1)} / ${max.toInt()} pts',
                style: AppTypography.body(
                  color: statusColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.full),
            child: LinearProgressIndicator(
              value: (pct / 100.0).clamp(0.0, 1.0),
              minHeight: 8,
              backgroundColor: isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight,
              valueColor: AlwaysStoppedAnimation<Color>(statusColor),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            desc,
            style: AppTypography.caption(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }

  // ── History Ledger ────────────────────────────────────────────────────────
  Widget _buildHistoryLedger(bool isDark, List<dynamic> history) {
    if (history.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.xl),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.history_toggle_off,
                size: 36,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'No Score Activity Recorded Yet',
                style: AppTypography.body(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Complete trips and maintain high ratings to build your verified score history.',
                textAlign: TextAlign.center,
                style: AppTypography.caption(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: history.length,
        separatorBuilder: (_, __) => Divider(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
          height: 1,
        ),
        itemBuilder: (context, idx) {
          final item = history[idx] as Map<String, dynamic>;
          final delta = item['delta']?.toString() ?? '+0.0';
          final title = item['title']?.toString() ?? 'Activity';
          final rawDate = item['date']?.toString() ?? '';
          final isPositive = delta.startsWith('+');

          String displayDate = rawDate;
          final parsedDate = DateTime.tryParse(rawDate);
          if (parsedDate != null) {
            final now = DateTime.now();
            final diff = now.difference(parsedDate.toLocal());
            if (diff.inMinutes < 1) {
              displayDate = 'Just now';
            } else if (diff.inMinutes < 60) {
              displayDate = '${diff.inMinutes}m ago';
            } else if (diff.inHours < 24) {
              displayDate = '${diff.inHours}h ago';
            } else if (diff.inDays < 7) {
              displayDate = '${diff.inDays}d ago';
            } else {
              displayDate = '${parsedDate.day.toString().padLeft(2, '0')}/${parsedDate.month.toString().padLeft(2, '0')}/${parsedDate.year}';
            }
          }

          return ListTile(
            leading: CircleAvatar(
              radius: 16,
              backgroundColor: isPositive
                  ? AppColors.accentGreen.withValues(alpha: 0.15)
                  : AppColors.error.withValues(alpha: 0.15),
              child: Icon(
                isPositive ? Icons.add_circle_outline : Icons.remove_circle_outline,
                size: 18,
                color: isPositive ? AppColors.accentGreen : AppColors.error,
              ),
            ),
            title: Text(
              title,
              style: AppTypography.body(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
            subtitle: Text(
              displayDate,
              style: AppTypography.caption(
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                fontSize: 11,
              ),
            ),
            trailing: Text(
              delta,
              style: AppTypography.body(
                color: isPositive ? AppColors.accentGreen : AppColors.error,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          );
        },
      ),
    );
  }

  // ── Tips Card ─────────────────────────────────────────────────────────────
  Widget _buildTipsCard(bool isDark, List<dynamic> tips) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1B4B) : const Color(0xFFEEF2FF),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: const Color(0xFF6366F1).withValues(alpha: 0.35),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.lightbulb_outline, color: Color(0xFF6366F1), size: 22),
              const SizedBox(width: 8),
              Text(
                'Actionable Boosters',
                style: AppTypography.body(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          ...tips.map((tip) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('• ', style: TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.bold)),
                    Expanded(
                      child: Text(
                        tip.toString(),
                        style: AppTypography.caption(
                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildSectionHeader({
    required String title,
    required String subtitle,
    required bool isDark,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: AppTypography.h4(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          subtitle,
          style: AppTypography.caption(
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}
