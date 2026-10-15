import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../shared/widgets/app_skeleton_loader.dart';

enum WithdrawalStatusState { requested, processing, successful, failed, cancelled }

/// Consolidated Withdrawal Details & Tracking Screen wired directly to real live settlements & wallet data.
class EarningsWithdrawalDetailsScreen extends StatefulWidget {
  final dynamic initialWithdrawal;

  const EarningsWithdrawalDetailsScreen({super.key, this.initialWithdrawal});

  @override
  State<EarningsWithdrawalDetailsScreen> createState() => _EarningsWithdrawalDetailsScreenState();
}

class _EarningsWithdrawalDetailsScreenState extends State<EarningsWithdrawalDetailsScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _settlements = [];
  Map<String, dynamic>? _selectedWithdrawal;
  Map<String, dynamic> _walletSummary = {};

  static const List<String> _months = [
    '',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialWithdrawal != null) {
      _selectedWithdrawal = _normalizeWithdrawal(widget.initialWithdrawal);
      _isLoading = false;
    }
    _loadLiveDetails();
  }

  Future<void> _loadLiveDetails() async {
    try {
      final results = await Future.wait([
        DriverService.instance.getSettlements(forceRefresh: true),
        DriverService.instance.getProfile(forceRefresh: true),
        DriverService.instance.getWalletSummary(forceRefresh: true),
      ]);

      final settlementsRaw = results[0] as List<dynamic>;
      final profile = results[1] as Map<String, dynamic>;
      final wallet = results[2] as Map<String, dynamic>;

      if (mounted) {
        setState(() {
          _walletSummary = wallet;
          _settlements = settlementsRaw
              .map((s) => _normalizeWithdrawal(s, fallbackProfile: profile))
              .toList();

          if (_selectedWithdrawal != null) {
            final selId = _selectedWithdrawal!['id']?.toString();
            final match = _settlements.cast<Map<String, dynamic>?>().firstWhere(
                  (s) => s != null && (s['id']?.toString() == selId || s['referenceId']?.toString() == selId),
                  orElse: () => null,
                );
            if (match != null) {
              _selectedWithdrawal = match;
            } else {
              _selectedWithdrawal = _normalizeWithdrawal(
                _selectedWithdrawal!,
                fallbackProfile: profile,
              );
            }
          } else if (_settlements.isNotEmpty) {
            _selectedWithdrawal = _settlements.first;
          }
        });
      }
    } catch (e) {
      debugPrint('Error loading live withdrawal details: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Map<String, dynamic> _normalizeWithdrawal(
    dynamic raw, {
    Map<String, dynamic>? fallbackProfile,
  }) {
    if (raw == null) return {};

    final Map<String, dynamic> src;
    if (raw is Map) {
      src = Map<String, dynamic>.from(raw);
    } else {
      src = {};
    }

    // Resolve nested raw object if present
    final nested = (src['raw'] is Map)
        ? Map<String, dynamic>.from(src['raw'] as Map)
        : (src['rawEntry'] is Map ? Map<String, dynamic>.from(src['rawEntry'] as Map) : null);

    // ID
    final id = (src['id'] ??
            src['referenceId'] ??
            src['settlementId'] ??
            nested?['id'] ??
            nested?['referenceId'] ??
            'WD-${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}')
        .toString();

    // Amount
    double amount = 0.0;
    if (src['amountVal'] is num) {
      amount = (src['amountVal'] as num).toDouble();
    } else if (src['amount'] is num) {
      amount = (src['amount'] as num).toDouble();
    } else if (nested != null && nested['amount'] is num) {
      amount = (nested['amount'] as num).toDouble();
    } else if (src['amount'] != null) {
      final clean = src['amount'].toString().replaceAll(RegExp(r'[^\d.]'), '');
      amount = double.tryParse(clean) ?? 0.0;
    }

    // Status
    final rawStatus = (src['status'] ?? nested?['status'] ?? 'PENDING').toString();
    final parsedState = _parseStatus(rawStatus);

    // Bank Details from settlement or profile
    final kyc = (fallbackProfile?['kycDocuments'] is Map)
        ? Map<String, dynamic>.from(fallbackProfile!['kycDocuments'] as Map)
        : {};

    final ifsc = (src['bankIfsc'] ??
            src['ifsc'] ??
            nested?['bankIfsc'] ??
            nested?['ifsc'] ??
            fallbackProfile?['bankIfsc'] ??
            fallbackProfile?['ifsc'] ??
            kyc['bankIfsc'] ??
            kyc['ifsc'] ??
            '')
        .toString()
        .trim()
        .toUpperCase();

    final bankNameRaw = (src['bankName'] ??
            src['bank_name'] ??
            nested?['bankName'] ??
            nested?['bank_name'] ??
            fallbackProfile?['bankName'] ??
            fallbackProfile?['bank_name'] ??
            kyc['bankName'] ??
            kyc['bank_name'] ??
            '')
        .toString()
        .trim();

    final bankName = (bankNameRaw.isNotEmpty && bankNameRaw != 'Not Provided')
        ? bankNameRaw
        : _inferBankName(ifsc);

    final accountNumber = (src['bankAccountNumber'] ??
            src['account_number'] ??
            nested?['bankAccountNumber'] ??
            nested?['account_number'] ??
            fallbackProfile?['bankAccountNumber'] ??
            fallbackProfile?['account_number'] ??
            kyc['bankAccountNumber'] ??
            kyc['account_number'] ??
            '')
        .toString()
        .trim();

    final accountHolder = (src['bankAccountName'] ??
            src['account_holder'] ??
            nested?['bankAccountName'] ??
            nested?['account_holder'] ??
            fallbackProfile?['bankAccountName'] ??
            fallbackProfile?['account_holder'] ??
            kyc['bankAccountName'] ??
            kyc['account_holder'] ??
            AuthService.instance.currentUser?.fullName ??
            'Driver Partner')
        .toString()
        .trim();

    final transactionRef = (src['transactionRef'] ??
            src['utr'] ??
            nested?['transactionRef'] ??
            nested?['utr'] ??
            '')
        .toString()
        .trim();

    final createdAt = (src['createdAt'] ??
            src['date'] ??
            nested?['createdAt'] ??
            DateTime.now().toIso8601String())
        .toString();

    final processedAt = (src['processedAt'] ??
            src['updatedAt'] ??
            nested?['processedAt'] ??
            nested?['updatedAt'])
        ?.toString();

    return {
      'id': id,
      'amount': amount,
      'status': rawStatus,
      'statusState': parsedState,
      'bankName': bankName,
      'bankAccountNumber': accountNumber,
      'bankAccountName': accountHolder,
      'bankIfsc': ifsc,
      'transactionRef': transactionRef,
      'createdAt': createdAt,
      'processedAt': processedAt,
    };
  }

  WithdrawalStatusState _parseStatus(String raw) {
    final s = raw.toUpperCase().trim();
    if (s.contains('SETTLE') || s.contains('SUCCESS') || s.contains('COMPLET')) {
      return WithdrawalStatusState.successful;
    }
    if (s.contains('PROCESS')) {
      return WithdrawalStatusState.processing;
    }
    if (s.contains('FAIL') || s.contains('DECLIN') || s.contains('REJECT')) {
      return WithdrawalStatusState.failed;
    }
    if (s.contains('CANCEL')) {
      return WithdrawalStatusState.cancelled;
    }
    return WithdrawalStatusState.requested;
  }

  String _inferBankName(String ifsc) {
    if (ifsc.length < 4) return 'Bank Account';
    final code = ifsc.substring(0, 4).toUpperCase();
    const map = {
      'HDFC': 'HDFC Bank',
      'SBIN': 'State Bank of India',
      'ICIC': 'ICICI Bank',
      'UTIB': 'Axis Bank',
      'KKBK': 'Kotak Mahindra Bank',
      'PUNB': 'Punjab National Bank',
      'BARB': 'Bank of Baroda',
      'UBIN': 'Union Bank of India',
      'CNRB': 'Canara Bank',
      'IDFB': 'IDFC First Bank',
      'YESB': 'Yes Bank',
      'INDB': 'IndusInd Bank',
      'IOBA': 'Indian Overseas Bank',
      'BKID': 'Bank of India',
      'CBIN': 'Central Bank of India',
      'MAHB': 'Bank of Maharashtra',
      'PSIB': 'Punjab & Sind Bank',
      'UCOB': 'UCO Bank',
    };
    return map[code] ?? '$code Bank';
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
      return '$month $day, ${dt.year} • $hour:$min $ampm';
    } catch (_) {
      return isoDate;
    }
  }

  String _maskAccountNumber(String? acc) {
    if (acc == null || acc.trim().isEmpty) return '•••• ----';
    final clean = acc.trim();
    if (clean.length <= 4) return '•••• $clean';
    return '•••• ${clean.substring(clean.length - 4)}';
  }

  String _formatCurrency(double amount) {
    if (amount % 1 == 0) {
      return '₹${amount.toInt().toString().replaceAllMapped(
            RegExp(r'(\d+?)(?=(\d{3})+(?!\d))'),
            (m) => '${m[1]},',
          )}';
    }
    return '₹${amount.toStringAsFixed(2)}';
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
                      bottom: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.walletScreen);
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
                          'Withdrawal Details',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => context.push(AppRoutes.helpSupportScreen),
                        tooltip: 'Support',
                        icon: Icon(
                          Icons.help_outline_rounded,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Recent Withdrawals Tab Selector (if multiple exist) ──────
                if (_settlements.length > 1) ...[
                  Container(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _settlements.map((item) {
                          final isSelected = _selectedWithdrawal?['id'] == item['id'];
                          final amt = (item['amount'] is num) ? (item['amount'] as num).toDouble() : 0.0;
                          final shortId = item['id'].toString().length > 8
                              ? item['id'].toString().substring(item['id'].toString().length - 6).toUpperCase()
                              : item['id'].toString();

                          final Color tagColor = switch (item['statusState'] as WithdrawalStatusState) {
                            WithdrawalStatusState.requested => AppColors.warning,
                            WithdrawalStatusState.processing => AppColors.info,
                            WithdrawalStatusState.successful => isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                            WithdrawalStatusState.failed => AppColors.error,
                            WithdrawalStatusState.cancelled => isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          };

                          return GestureDetector(
                            onTap: () => setState(() => _selectedWithdrawal = item),
                            child: Container(
                              margin: const EdgeInsets.only(right: 8),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? (isDark ? AppColors.primary.withValues(alpha: 0.3) : AppColors.primaryLight.withValues(alpha: 0.15))
                                    : (isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight),
                                borderRadius: BorderRadius.circular(AppRadius.full),
                                border: Border.all(
                                  color: isSelected
                                      ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                      : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                  width: isSelected ? 1.5 : 1.0,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 7,
                                    height: 7,
                                    decoration: BoxDecoration(
                                      color: tagColor,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'WD-$shortId • ${_formatCurrency(amt)}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                      color: isSelected
                                          ? (isDark ? AppColors.textPrimaryDark : AppColors.primary)
                                          : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                  Divider(
                    height: 1,
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ],

                // ── Scrollable Body with Live Data ───────────────────────────
                Expanded(
                  child: _isLoading && _selectedWithdrawal == null
                      ? _buildLoadingSkeleton(isDark)
                      : _selectedWithdrawal == null
                          ? _buildEmptyState(isDark)
                          : RefreshIndicator(
                              onRefresh: _loadLiveDetails,
                              child: ListView(
                                padding: const EdgeInsets.all(AppSpacing.lg),
                                children: [
                                  // ── Dynamic Status Banner Card ─────────────
                                  _buildStatusCard(_selectedWithdrawal!, isDark),
                                  const SizedBox(height: AppSpacing.xl),

                                  // ── Status Progress Stepper ────────────────
                                  Text(
                                    'Status Progress',
                                    style: AppTypography.caption(
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: AppSpacing.md),
                                  _buildStepperCard(_selectedWithdrawal!['statusState'] as WithdrawalStatusState, isDark),
                                  const SizedBox(height: AppSpacing.xl),

                                  // ── Details Breakdown Card ─────────────────
                                  Text(
                                    'Details',
                                    style: AppTypography.caption(
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: AppSpacing.md),

                                  _buildDetailsCard(_selectedWithdrawal!, isDark),
                                  const SizedBox(height: AppSpacing.xl),

                                  // ── State Action Buttons ───────────────────
                                  _buildStateActions(_selectedWithdrawal!, isDark),

                                  // ── Support / Need Help Footer ─────────────
                                  _buildSupportCard(isDark),
                                  const SizedBox(height: 60),
                                ],
                              ),
                            ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingSkeleton(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        children: const [
          AppSkeletonLoader(height: 140, borderRadius: AppRadius.lg),
          SizedBox(height: AppSpacing.xl),
          AppSkeletonLoader(height: 80, borderRadius: AppRadius.lg),
          SizedBox(height: AppSpacing.xl),
          AppSkeletonLoader(height: 240, borderRadius: AppRadius.lg),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    final balance = (_walletSummary['availableBalance'] is num)
        ? (_walletSummary['availableBalance'] as num).toDouble()
        : ((_walletSummary['walletBalance'] is num)
            ? (_walletSummary['walletBalance'] as num).toDouble()
            : 0.0);

    return RefreshIndicator(
      onRefresh: _loadLiveDetails,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.xl),
        children: [
          const SizedBox(height: 40),
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.primary.withValues(alpha: 0.15)
                    : AppColors.primaryLight.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.account_balance_wallet_outlined,
                size: 40,
                color: isDark ? AppColors.primaryLight : AppColors.primary,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'No Withdrawals Yet',
            textAlign: TextAlign.center,
            style: AppTypography.h3(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'You have not submitted any withdrawal requests yet.\nAvailable balance: ${_formatCurrency(balance)}',
            textAlign: TextAlign.center,
            style: AppTypography.body(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          AppPrimaryButton(
            text: 'REQUEST WITHDRAWAL',
            onPressed: () => context.push(AppRoutes.earningsWithdrawScreen),
          ),
          const SizedBox(height: AppSpacing.xl),
          _buildSupportCard(isDark),
        ],
      ),
    );
  }

  Widget _buildStatusCard(Map<String, dynamic> data, bool isDark) {
    final state = data['statusState'] as WithdrawalStatusState;
    final amount = (data['amount'] is num) ? (data['amount'] as num).toDouble() : 0.0;
    final formattedAmount = _formatCurrency(amount);
    final bank = (data['bankName'] ?? 'Bank Account').toString();
    final withdrawalId = data['id'].toString();

    final title = switch (state) {
      WithdrawalStatusState.requested => 'Withdrawal Requested',
      WithdrawalStatusState.processing => 'Processing Transfer',
      WithdrawalStatusState.successful => 'Withdrawal Successful',
      WithdrawalStatusState.failed => 'Withdrawal Failed',
      WithdrawalStatusState.cancelled => 'Withdrawal Cancelled',
    };

    final subtitle = switch (state) {
      WithdrawalStatusState.requested => 'Your withdrawal request has been queued for bank transfer.',
      WithdrawalStatusState.processing => 'Bank transfer in progress. Estimated completion within 2-4 hours.',
      WithdrawalStatusState.successful => 'Funds credited to your $bank account successfully.',
      WithdrawalStatusState.failed => 'Beneficiary bank declined transfer. $formattedAmount returned to wallet balance.',
      WithdrawalStatusState.cancelled => 'Withdrawal request was cancelled by driver.',
    };

    final Color statusColor = switch (state) {
      WithdrawalStatusState.requested => AppColors.warning,
      WithdrawalStatusState.processing => AppColors.info,
      WithdrawalStatusState.successful => isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
      WithdrawalStatusState.failed => AppColors.error,
      WithdrawalStatusState.cancelled => isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
    };

    final IconData icon = switch (state) {
      WithdrawalStatusState.requested => Icons.schedule_rounded,
      WithdrawalStatusState.processing => Icons.sync_rounded,
      WithdrawalStatusState.successful => Icons.check_rounded,
      WithdrawalStatusState.failed => Icons.close_rounded,
      WithdrawalStatusState.cancelled => Icons.block_rounded,
    };

    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: statusColor.withValues(alpha: isDark ? 0.15 : 0.08),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: statusColor.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.caption(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  formattedAmount,
                  style: AppTypography.h1(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ).copyWith(fontSize: 30),
                ),
                const SizedBox(height: 6),
                Text(
                  subtitle,
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Text(
                      'Withdrawal ID: ',
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                    Flexible(
                      child: Text(
                        withdrawalId,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.caption(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    GestureDetector(
                      onTap: () {
                        Clipboard.setData(ClipboardData(text: withdrawalId));
                        Fluttertoast.showToast(msg: 'Withdrawal ID copied!');
                      },
                      child: Icon(
                        Icons.copy_rounded,
                        size: 14,
                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              border: Border.all(color: statusColor, width: 2),
            ),
            child: Icon(
              icon,
              color: statusColor,
              size: 26,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepperCard(WithdrawalStatusState currentState, bool isDark) {
    final bool step1Done = true;
    final bool step2Done = currentState == WithdrawalStatusState.processing ||
        currentState == WithdrawalStatusState.successful;
    final bool step3Done = currentState == WithdrawalStatusState.successful;
    final bool isFailed = currentState == WithdrawalStatusState.failed;
    final bool isCancelled = currentState == WithdrawalStatusState.cancelled;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildStepNode(title: 'Requested', isDone: step1Done, isDark: isDark),
          Expanded(child: _buildStepLine(isDone: step2Done, isDark: isDark)),
          _buildStepNode(
            title: 'Processing',
            isDone: step2Done,
            isActive: currentState == WithdrawalStatusState.processing,
            isDark: isDark,
          ),
          Expanded(child: _buildStepLine(isDone: step3Done, isDark: isDark)),
          _buildStepNode(
            title: isFailed
                ? 'Failed'
                : (isCancelled ? 'Cancelled' : 'Completed'),
            isDone: step3Done,
            isFailed: isFailed,
            isCancelled: isCancelled,
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildStepNode({
    required String title,
    required bool isDone,
    required bool isDark,
    bool isActive = false,
    bool isFailed = false,
    bool isCancelled = false,
  }) {
    final Color bg = isFailed
        ? AppColors.error
        : (isCancelled
            ? (isDark ? AppColors.textMutedDark : AppColors.textMutedLight)
            : (isActive
                ? AppColors.info
                : (isDone
                    ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
                    : (isDark ? AppColors.borderDark : AppColors.borderLight))));

    final IconData icon = isFailed
        ? Icons.close
        : (isCancelled ? Icons.block : Icons.check);

    return Column(
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: bg,
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            size: 14,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          title,
          style: AppTypography.caption(
            color: isDone || isActive || isFailed
                ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)
                : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
            fontWeight: isDone || isActive ? FontWeight.bold : FontWeight.w500,
          ).copyWith(fontSize: 11),
        ),
      ],
    );
  }

  Widget _buildStepLine({required bool isDone, required bool isDark}) {
    return Container(
      height: 2,
      color: isDone
          ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
          : (isDark ? AppColors.borderDark : AppColors.borderLight),
    );
  }

  Widget _buildDetailsCard(Map<String, dynamic> data, bool isDark) {
    final state = data['statusState'] as WithdrawalStatusState;
    final amount = (data['amount'] is num) ? (data['amount'] as num).toDouble() : 0.0;
    final bank = (data['bankName'] ?? 'Bank Account').toString();
    final acc = (data['bankAccountNumber'] ?? '').toString();
    final maskedAcc = _maskAccountNumber(acc);
    final holder = (data['bankAccountName'] ?? AuthService.instance.currentUser?.fullName ?? 'Driver Partner').toString();
    final ifsc = (data['bankIfsc'] ?? '').toString();
    final requestedOn = _formatDateTime(data['createdAt'] as String?);

    final String processedOn = switch (state) {
      WithdrawalStatusState.requested => 'Pending...',
      WithdrawalStatusState.processing => 'In Progress (Est. within 2-4 hours)',
      WithdrawalStatusState.successful => _formatDateTime(data['processedAt'] as String? ?? data['createdAt'] as String?),
      WithdrawalStatusState.failed => '${_formatDateTime(data['processedAt'] as String? ?? data['createdAt'] as String?)} (Failed)',
      WithdrawalStatusState.cancelled => '${_formatDateTime(data['processedAt'] as String? ?? data['createdAt'] as String?)} (Cancelled)',
    };

    final rawRef = (data['transactionRef'] ?? '').toString().trim();
    final refId = rawRef.isNotEmpty
        ? rawRef
        : (state == WithdrawalStatusState.successful ? 'Assigned by Bank' : 'N/A');

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        children: [
          _buildDetailRow('Amount', _formatCurrency(amount), isDark, isBold: true),
          Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
          _buildDetailRow('Bank', bank, isDark),
          Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
          _buildDetailRow('Account Number', maskedAcc, isDark),
          if (ifsc.isNotEmpty) ...[
            Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
            _buildDetailRow('IFSC Code', ifsc, isDark),
          ],
          Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
          _buildDetailRow('Account Holder', holder, isDark),
          Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
          _buildDetailRow('Requested On', requestedOn, isDark),
          Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
          _buildDetailRow('Processed On', processedOn, isDark),
          Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
          _buildDetailRow('Reference ID', refId, isDark),
        ],
      ),
    );
  }

  Widget _buildStateActions(Map<String, dynamic> data, bool isDark) {
    final state = data['statusState'] as WithdrawalStatusState;

    if (state == WithdrawalStatusState.failed) {
      return Column(
        children: [
          AppPrimaryButton(
            text: 'RETRY WITHDRAWAL',
            onPressed: () => context.push(AppRoutes.earningsWithdrawScreen),
          ),
          const SizedBox(height: AppSpacing.lg),
        ],
      );
    }

    if (state == WithdrawalStatusState.cancelled) {
      return Column(
        children: [
          AppPrimaryButton(
            text: 'NEW WITHDRAWAL',
            onPressed: () => context.push(AppRoutes.earningsWithdrawScreen),
          ),
          const SizedBox(height: AppSpacing.lg),
        ],
      );
    }

    if (state == WithdrawalStatusState.requested || state == WithdrawalStatusState.processing) {
      return Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.lg),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: (isDark ? AppColors.info : AppColors.info.withValues(alpha: 0.1)),
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.info.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            const Icon(Icons.info_outline_rounded, color: AppColors.info, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Transfers are processed automatically via banking network. Once completed, your reference UTR will appear here.',
                style: AppTypography.caption(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildDetailRow(String label, String value, bool isDark, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTypography.body(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.body(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSupportCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.headset_mic_outlined,
            color: isDark ? AppColors.primaryLight : AppColors.primary,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Need Help?',
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Contact our support team for any queries',
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () => context.push(AppRoutes.helpSupportScreen),
            style: ElevatedButton.styleFrom(
              backgroundColor: isDark
                  ? AppColors.primary.withValues(alpha: 0.25)
                  : AppColors.primaryLight.withValues(alpha: 0.15),
              foregroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
            ),
            child: Text(
              'SUPPORT',
              style: AppTypography.caption(
                color: isDark ? AppColors.primaryLight : AppColors.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
