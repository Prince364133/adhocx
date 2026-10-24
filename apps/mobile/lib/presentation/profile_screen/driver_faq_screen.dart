import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/utils/app_logger.dart';
import '../../routes/app_routes.dart';
import '../../services/language_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

class FaqItem {
  final String question;
  final String answer;
  final String category;

  const FaqItem({
    required this.question,
    required this.answer,
    required this.category,
  });
}

class DriverFaqScreen extends StatefulWidget {
  const DriverFaqScreen({super.key});

  @override
  State<DriverFaqScreen> createState() => _DriverFaqScreenState();
}

class _DriverFaqScreenState extends State<DriverFaqScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'ALL';
  int? _expandedIndex;

  final List<String> _categories = [
    'ALL',
    'Trips & Bidding',
    'Earnings & Payouts',
    'Account & KYC',
    'Vehicle & Fleet',
    'Safety & Policies',
  ];

  final List<FaqItem> _faqList = const [
    FaqItem(
      category: 'Trips & Bidding',
      question: 'How do I accept or bid on trip requirements?',
      answer:
          'Open the Opportunities tab from the bottom navigation. Browse available trips matching your vehicle category. Tap "Place Bid" to enter your best rate or "Accept" if an instant dispatch price is available. Once matched by the passenger or corporate client, the trip moves to your Trips screen with turn-by-turn navigation guidance.',
    ),
    FaqItem(
      category: 'Earnings & Payouts',
      question: 'When and how are my trip earnings paid out?',
      answer:
          'Trip earnings are instantly credited to your AdhocX Driver Wallet upon passenger drop-off and OTP verification. You can withdraw funds directly to your linked bank account anytime from Profile > Earnings & Wallet. Standard IMPS settlements take less than 15 minutes.',
    ),
    FaqItem(
      category: 'Account & KYC',
      question: 'How long does KYC & Document verification take?',
      answer:
          'Our compliance verification desk reviews submissions within 2 to 4 operational hours. Ensure your Driving License, RC Book, Commercial Insurance, and Aadhaar Card photos are clearly readable without glare.',
    ),
    FaqItem(
      category: 'Trips & Bidding',
      question: 'What happens if a passenger or client cancels a trip?',
      answer:
          'If a trip is cancelled after you have commenced travel or arrived at the pickup location, a cancellation fee is automatically calculated and credited to your driver wallet in accordance with platform trip guarantee terms.',
    ),
    FaqItem(
      category: 'Vehicle & Fleet',
      question: 'How do I update or add a new vehicle to my account?',
      answer:
          'Navigate to Driver Profile > Vehicle Details. You can view your current assigned vehicle or submit registration documents for an additional vehicle. Once verified by operations, the new vehicle becomes selectable for ride assignments.',
    ),
    FaqItem(
      category: 'Earnings & Payouts',
      question: 'Are there any platform commissions or hidden charges?',
      answer:
          'AdhocX operates on a transparent, flat commission model with zero hidden fees. Your driver rate card displays the exact base fare, per-kilometer rate, and waiting charges upfront before you accept any assignment.',
    ),
    FaqItem(
      category: 'Safety & Policies',
      question: 'What should I do in case of an accident or road emergency?',
      answer:
          'First ensure personal safety and that of your passengers. In case of medical emergencies, dial 112 immediately. You can reach the AdhocX 24/7 Operations Incident Helpline at +91 7893545818 or tap Call Support for live roadside assistance.',
    ),
    FaqItem(
      category: 'Account & KYC',
      question: 'How do I maintain a high Driver Rating and priority status?',
      answer:
          'Maintaining an on-time arrival rate above 95%, keeping your vehicle clean, and ensuring courteous passenger interactions maintain your 5.0 Star standing and Gold Driver Tier, which unlocks priority corporate dispatch.',
    ),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _launchCallSupport() async {
    final telUri = Uri(scheme: 'tel', path: '+917893545818');
    try {
      await launchUrl(telUri, mode: LaunchMode.externalApplication);
    } catch (e) {
      AppLogger.error('Failed to launch phone dialer: $e', tag: 'SUPPORT');
    }
  }


  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final query = _searchController.text.toLowerCase().trim();

    final filteredFaqs = _faqList.where((item) {
      final matchesCategory = _selectedCategory == 'ALL' || item.category == _selectedCategory;
      final matchesQuery = query.isEmpty ||
          item.question.toLowerCase().contains(query) ||
          item.answer.toLowerCase().contains(query);
      return matchesCategory && matchesQuery;
    }).toList();

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
                          context.tr('Frequently Asked Questions'),
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

                // ── Scrollable Body ──────────────────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      // ── Search Bar ─────────────────────────────────────────
                      Container(
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: TextField(
                          controller: _searchController,
                          onChanged: (_) => setState(() {}),
                          style: TextStyle(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontSize: 14,
                          ),
                          decoration: InputDecoration(
                            hintText: context.tr('Search FAQs'),
                            hintStyle: TextStyle(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              fontSize: 14,
                            ),
                            prefixIcon: Icon(
                              Icons.search,
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              size: 20,
                            ),
                            suffixIcon: _searchController.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear, size: 18),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() {});
                                    },
                                  )
                                : null,
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),

                      // ── Categories Horizontal Filter ───────────────────────
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: _categories.map((cat) {
                            final isSelected = _selectedCategory == cat;
                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text(cat == 'ALL' ? 'All Topics' : cat),
                                selected: isSelected,
                                onSelected: (sel) {
                                  if (sel) {
                                    setState(() {
                                      _selectedCategory = cat;
                                      _expandedIndex = null;
                                    });
                                  }
                                },
                                selectedColor: AppColors.primaryLight,
                                backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                labelStyle: TextStyle(
                                  fontSize: 12,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                  color: isSelected
                                      ? Colors.white
                                      : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(20),
                                  side: BorderSide(
                                    color: isSelected
                                        ? AppColors.primaryLight
                                        : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // ── FAQs List ──────────────────────────────────────────
                      if (filteredFaqs.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.xxl),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.search_off_rounded,
                                size: 48,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                              const SizedBox(height: AppSpacing.md),
                              Text(
                                'No matching questions found',
                                style: AppTypography.body(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Try a different search term or browse by category.',
                                textAlign: TextAlign.center,
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        ...List.generate(filteredFaqs.length, (index) {
                          final item = filteredFaqs[index];
                          final isExpanded = _expandedIndex == index;

                          return Container(
                            margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(
                                color: isExpanded
                                    ? AppColors.primaryLight.withValues(alpha: 0.5)
                                    : (isDark ? AppColors.borderDark : AppColors.borderLight),
                              ),
                            ),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              onTap: () {
                                setState(() {
                                  _expandedIndex = isExpanded ? null : index;
                                });
                              },
                              child: Padding(
                                padding: const EdgeInsets.all(AppSpacing.md),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            item.question,
                                            style: AppTypography.body(
                                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                        Icon(
                                          isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                        ),
                                      ],
                                    ),
                                    if (isExpanded) ...[
                                      const SizedBox(height: AppSpacing.sm),
                                      Divider(
                                        height: 1,
                                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                      ),
                                      const SizedBox(height: AppSpacing.sm),
                                      Text(
                                        item.answer,
                                        style: AppTypography.body(
                                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                        ).copyWith(height: 1.45),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          );
                        }),

                      const SizedBox(height: AppSpacing.xl),

                      // ── Still Need Help Contact Box ────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.2),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  Icons.support_agent_rounded,
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  size: 24,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Still need assistance?',
                                  style: AppTypography.body(
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Our 24/7 dedicated driver support team is ready to resolve your issue.',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: _launchCallSupport,
                                    icon: const Icon(Icons.phone_in_talk, size: 16),
                                    label: const Text('Call Us', style: TextStyle(fontSize: 12)),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
                                      side: BorderSide(
                                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                                      ),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(AppRadius.sm),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: ElevatedButton.icon(
                                    onPressed: () => context.push(AppRoutes.reportIssueScreen),
                                    icon: const Icon(Icons.report_problem, size: 16, color: Colors.white),
                                    label: const Text('Report Issue', style: TextStyle(fontSize: 12, color: Colors.white)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(AppRadius.sm),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
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
}
