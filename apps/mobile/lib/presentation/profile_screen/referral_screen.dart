import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/language_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

class ReferralScreen extends StatefulWidget {
  const ReferralScreen({super.key});

  @override
  State<ReferralScreen> createState() => _ReferralScreenState();
}

class _ReferralScreenState extends State<ReferralScreen> {
  bool _isLoading = true;
  String? _claimingId;
  bool _isClaimingAll = false;
  Map<String, dynamic>? _dashboardData;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard({bool forceRefresh = false}) async {
    try {
      final data = await DriverService.instance.getReferralDashboard(forceRefresh: forceRefresh);
      if (mounted) {
        setState(() {
          _dashboardData = data;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          if (_dashboardData == null) {
            final authUser = AuthService.instance.currentUser;
            final clean = (authUser?.phone ?? '').replaceAll(RegExp(r'\D'), '');
            final p10 = clean.length >= 10 ? clean.substring(clean.length - 10) : clean;
            _dashboardData = {
              'phone': authUser?.phone,
              'referralCode': p10,
              'vaultLockedRupees': 0,
              'claimableRupees': 0,
              'claimedRupees': 0,
              'completedRides': 0,
              'milestoneRides': 100,
              'milestoneReached': false,
              'ridesRemainingToMilestone': 100,
              'totalReferrals': 0,
              'verifiedReferrals': 0,
              'referees': [],
            };
          }
        });
      }
    }
  }

  Future<void> _claimReward(String referralId) async {
    setState(() => _claimingId = referralId);
    try {
      final res = await DriverService.instance.claimReferralReward(referralId);
      if (res != null && res['success'] == true) {
        if (mounted) {
          _showClaimSuccessDialog(res['claimedAmountRupees'] ?? 500);
          await _loadDashboard(forceRefresh: true);
        }
      } else {
        Fluttertoast.showToast(msg: res?['message'] ?? 'Could not claim reward');
      }
    } catch (e) {
      Fluttertoast.showToast(msg: e.toString().replaceAll('Exception:', '').trim());
    } finally {
      if (mounted) setState(() => _claimingId = null);
    }
  }

  Future<void> _claimAllRewards() async {
    setState(() => _isClaimingAll = true);
    try {
      final res = await DriverService.instance.claimAllReferralRewards();
      if (res != null && res['success'] == true) {
        if (mounted) {
          _showClaimSuccessDialog(res['claimedAmountRupees'] ?? 500);
          await _loadDashboard(forceRefresh: true);
        }
      } else {
        Fluttertoast.showToast(msg: res?['message'] ?? 'No rewards eligible to claim');
      }
    } catch (e) {
      Fluttertoast.showToast(msg: e.toString().replaceAll('Exception:', '').trim());
    } finally {
      if (mounted) setState(() => _isClaimingAll = false);
    }
  }

  void _showClaimSuccessDialog(int amount) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
        title: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: AppColors.accentGreen, size: 28),
            const SizedBox(width: AppSpacing.sm),
            Text(
              context.tr('Added to Wallet!'),
              style: AppTypography.h3(color: isDark ? Colors.white : AppColors.textPrimaryLight),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '₹$amount ${context.tr('has been successfully added to your withdrawal wallet.')}',
              style: AppTypography.body(color: isDark ? Colors.white : AppColors.textPrimaryLight),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              context.tr('You can withdraw your earnings immediately to your registered bank account.'),
              style: AppTypography.caption(color: isDark ? Colors.white70 : AppColors.textSecondaryLight),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(context.tr('CLOSE')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              context.push(AppRoutes.walletScreen);
            },
            child: Text(context.tr('VIEW WALLET')),
          ),
        ],
      ),
    );
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    Fluttertoast.showToast(
      msg: '$label ${context.tr('copied to clipboard!')}',
      backgroundColor: AppColors.primary,
      textColor: Colors.white,
    );
  }

  Future<void> _shareOnWhatsApp(String code, String phone) async {
    final authPhone = AuthService.instance.currentUser?.phone ?? '';
    final effective = phone.isNotEmpty ? phone : (authPhone.isNotEmpty ? authPhone : code);
    final cleanDigits = effective.replaceAll(RegExp(r'\D'), '');
    final sharePhone = cleanDigits.length >= 10 ? cleanDigits.substring(cleanDigits.length - 10) : (code.isNotEmpty ? code : cleanDigits);

    final message =
        'Namaste! Join AdhocX as a Driver Partner and earn guaranteed distance-based payouts.\n\n'
        'Use my Referral Phone Number: *$sharePhone* during registration!\n\n'
        'Download the AdhocX Driver App from Google Play Store:\n'
        'https://play.google.com/store/apps/details?id=com.adhocx.app';

    final uri = Uri.parse('whatsapp://send?text=${Uri.encodeComponent(message)}');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        final webUri = Uri.parse('https://api.whatsapp.com/send?text=${Uri.encodeComponent(message)}');
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      Fluttertoast.showToast(msg: 'Could not open WhatsApp');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? AppColors.bgDark : AppColors.bgLight;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: Text(
          context.tr('Refer & Earn'),
          style: AppTypography.h3(color: isDark ? Colors.white : AppColors.textPrimaryLight),
        ),
        backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: isDark ? Colors.white : AppColors.textPrimaryLight),
          onPressed: () => context.pop(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () => _loadDashboard(forceRefresh: true),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildShareCodeCard(isDark),
                    const SizedBox(height: AppSpacing.md),
                    _buildVaultMilestoneCard(isDark),
                    const SizedBox(height: AppSpacing.lg),
                    _buildRefereesSection(isDark),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildShareCodeCard(bool isDark) {
    final authPhone = AuthService.instance.currentUser?.phone ?? '';
    final rawPhone = (_dashboardData?['phone']?.toString() ?? '').isNotEmpty
        ? _dashboardData!['phone'].toString()
        : authPhone;
    final rawCode = _dashboardData?['referralCode']?.toString() ?? '';
    final cleanPhone = rawPhone.replaceAll(RegExp(r'\D'), '');
    final phone10 = cleanPhone.length >= 10 ? cleanPhone.substring(cleanPhone.length - 10) : cleanPhone;
    final displayCode = phone10.isNotEmpty ? phone10 : (rawCode.isNotEmpty ? rawCode : cleanPhone);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primarySubtle,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: const Icon(Icons.card_giftcard_rounded, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('Earn ₹500 Per Driver'),
                      style: AppTypography.h4(color: isDark ? Colors.white : AppColors.textPrimaryLight),
                    ),
                    Text(
                      context.tr('Friends sign up using your registered phone number. You earn ₹500 for each verified driver!'),
                      style: AppTypography.caption(
                        color: isDark ? Colors.white70 : AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          // Referral Code (Phone Number) Box
          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('YOUR REFERRAL CODE (PHONE NUMBER)'),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white60 : AppColors.textSecondaryLight,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      displayCode.isNotEmpty
                          ? displayCode
                          : (rawPhone.isNotEmpty
                              ? rawPhone
                              : (authPhone.isNotEmpty ? authPhone : 'Loading...')),
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.5,
                        color: AppColors.primaryLight,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.copy_rounded, color: AppColors.primary),
                  tooltip: context.tr('Copy Phone Number'),
                  onPressed: () => _copyToClipboard(displayCode.isNotEmpty ? displayCode : rawPhone, context.tr('Referral Phone Number')),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              context.tr('New drivers enter your mobile number while registering to link you as their referrer.'),
              style: TextStyle(fontSize: 11, color: isDark ? Colors.white60 : AppColors.textSecondaryLight),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          // Share on WhatsApp Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF25D366), // WhatsApp Green
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                elevation: 0,
              ),
              icon: const Icon(Icons.send_rounded, size: 18),
              label: Text(
                context.tr('Share via WhatsApp'),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
              onPressed: () => _shareOnWhatsApp(displayCode, rawPhone),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVaultMilestoneCard(bool isDark) {
    final completedRides = (_dashboardData?['completedRides'] as num?)?.toInt() ?? 0;
    final milestoneRides = (_dashboardData?['milestoneRides'] as num?)?.toInt() ?? 100;
    final milestoneReached = _dashboardData?['milestoneReached'] == true;
    final ridesRemaining = (_dashboardData?['ridesRemainingToMilestone'] as num?)?.toInt() ?? 0;
    final vaultLocked = (_dashboardData?['vaultLockedRupees'] as num?)?.toInt() ?? 0;
    final claimable = (_dashboardData?['claimableRupees'] as num?)?.toInt() ?? 0;
    final claimed = (_dashboardData?['claimedRupees'] as num?)?.toInt() ?? 0;

    final progress = (completedRides / milestoneRides).clamp(0.0, 1.0);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primaryGradientStart, AppColors.primaryGradientEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.lock_clock_rounded, color: Colors.amberAccent, size: 22),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    context.tr('REFERRAL VAULT'),
                    style: const TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                      letterSpacing: 1.0,
                    ),
                  ),
                ],
              ),
              if (milestoneReached && claimable > 0)
                TextButton.icon(
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
                  ),
                  onPressed: _isClaimingAll ? null : _claimAllRewards,
                  icon: _isClaimingAll
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                        )
                      : const Icon(Icons.bolt_rounded, size: 16),
                  label: Text(
                    context.tr('CLAIM ALL'),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          // Vault Display Amount
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '₹${claimable > 0 ? claimable : vaultLocked}',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 32,
                ),
              ),
              const SizedBox(width: AppSpacing.xs),
              Text(
                milestoneReached
                    ? (claimable > 0 ? context.tr('Ready to Claim!') : context.tr('Claimed to Wallet'))
                    : context.tr('Locked in Vault'),
                style: TextStyle(
                  color: milestoneReached ? Colors.amberAccent : Colors.white70,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          // Milestone Progress Bar
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${context.tr('100-Ride Milestone:')} $completedRides / $milestoneRides',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              ),
              Text(
                milestoneReached ? context.tr('UNLOCKED ✓') : '$ridesRemaining ${context.tr('left')}',
                style: TextStyle(
                  color: milestoneReached ? Colors.greenAccent : Colors.amberAccent,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.full),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 10,
              backgroundColor: Colors.white24,
              valueColor: AlwaysStoppedAnimation<Color>(
                milestoneReached ? Colors.greenAccent : Colors.amberAccent,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            milestoneReached
                ? context.tr('Milestone reached! You can now transfer all referral earnings to your withdrawal wallet.')
                : '$ridesRemaining ${context.tr('more completed rides required to unlock instant wallet transfers.')}',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
          if (claimed > 0) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              '${context.tr('Total Claimed to Date:')} ₹$claimed',
              style: const TextStyle(color: Colors.white60, fontSize: 11),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildRefereesSection(bool isDark) {
    final referees = (_dashboardData?['referees'] as List?) ?? [];
    final milestoneReached = _dashboardData?['milestoneReached'] == true;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${context.tr('Referred Drivers')} (${referees.length})',
              style: AppTypography.h3(color: isDark ? Colors.white : AppColors.textPrimaryLight),
            ),
            if (referees.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  '₹500 / driver',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white70 : AppColors.primary,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        if (referees.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.xl),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : Colors.white,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
            ),
            child: Column(
              children: [
                Icon(Icons.group_add_rounded, size: 48, color: isDark ? Colors.white38 : AppColors.textSecondaryLight),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  context.tr('No Drivers Onboarded Yet'),
                  style: AppTypography.h4(color: isDark ? Colors.white : AppColors.textPrimaryLight),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  context.tr('Share your referral code or mobile number with fellow taxi drivers to start earning ₹500 per driver!'),
                  textAlign: TextAlign.center,
                  style: AppTypography.caption(
                    color: isDark ? Colors.white60 : AppColors.textSecondaryLight,
                  ),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: referees.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) {
              final ref = Map<String, dynamic>.from(referees[index]);
              return _buildRefereeCard(ref, milestoneReached, isDark);
            },
          ),
      ],
    );
  }

  Widget _buildRefereeCard(Map<String, dynamic> ref, bool milestoneReached, bool isDark) {
    final id = ref['id']?.toString() ?? '';
    final name = ref['refereeName']?.toString() ?? 'Driver Partner';
    final phone = ref['refereePhoneMasked']?.toString() ?? '';
    final photoUrl = ref['refereePhotoUrl']?.toString();
    final status = ref['status']?.toString() ?? 'PENDING_VERIFICATION';
    final rewardRupees = (ref['rewardRupees'] as num?)?.toInt() ?? 500;
    final isClaimable = ref['isClaimable'] == true;
    final isClaimingThis = _claimingId == id;

    final isPendingKyc = status == 'PENDING_VERIFICATION';
    final isClaimed = status == 'CLAIMED';
    final isUnlocked = status == 'UNLOCKED_READY_TO_CLAIM';

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isClaimed
              ? AppColors.accentGreen.withValues(alpha: 0.3)
              : (isDark ? AppColors.borderDark : AppColors.borderLight),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Driver Avatar
              CircleAvatar(
                radius: 24,
                backgroundColor: isDark ? AppColors.surfaceElevatedDark : AppColors.primarySubtle,
                backgroundImage: photoUrl != null && photoUrl.isNotEmpty ? NetworkImage(photoUrl) : null,
                child: photoUrl == null || photoUrl.isEmpty
                    ? Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'D',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 18),
                      )
                    : null,
              ),
              const SizedBox(width: AppSpacing.md),
              // Driver Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: AppTypography.h4(color: isDark ? Colors.white : AppColors.textPrimaryLight),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      phone,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? Colors.white60 : AppColors.textSecondaryLight,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              // Reward Chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isClaimed
                      ? AppColors.accentGreen.withValues(alpha: 0.12)
                      : (isUnlocked ? AppColors.primarySubtle : Colors.grey.withValues(alpha: 0.1)),
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  '+₹$rewardRupees',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: isClaimed
                        ? AppColors.accentGreen
                        : (isUnlocked ? AppColors.primary : Colors.grey),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          // Action / Status Row
          if (isPendingKyc)
            Row(
              children: [
                const Icon(Icons.hourglass_top_rounded, size: 16, color: Colors.orange),
                const SizedBox(width: 6),
                Text(
                  context.tr('KYC Under Review — Reward unlocks upon approval'),
                  style: const TextStyle(fontSize: 12, color: Colors.orange, fontWeight: FontWeight.w500),
                ),
              ],
            )
          else if (isClaimed)
            Row(
              children: [
                const Icon(Icons.check_circle_rounded, size: 18, color: AppColors.accentGreen),
                const SizedBox(width: 6),
                Text(
                  context.tr('Added to Withdrawal Wallet (Transferred)'),
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.accentGreen,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            )
          else if (isUnlocked)
            SizedBox(
              width: double.infinity,
              height: 42,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: isClaimable ? AppColors.accentGreen : Colors.grey.shade400,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
                onPressed: isClaimable && !isClaimingThis ? () => _claimReward(id) : null,
                icon: isClaimingThis
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Icon(isClaimable ? Icons.account_balance_wallet_rounded : Icons.lock_rounded, size: 16),
                label: Text(
                  isClaimable
                      ? '${context.tr('Add to Withdrawal Wallet')} (+₹$rewardRupees)'
                      : context.tr('Locked — Complete 100 Rides to Claim'),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
