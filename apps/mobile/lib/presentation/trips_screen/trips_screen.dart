import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/app_toast.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../services/language_service.dart';

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> with WidgetsBindingObserver {
  static const int _pageSize = 20;

  final ScrollController _scrollController = ScrollController();
  List<Map<String, dynamic>> _completedTrips = [];
  StreamSubscription<Map<String, dynamic>>? _tripSubscription;
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  bool _isFetching = false;
  int _page = 0;
  String? _errorMessage;
  String? _loadMoreError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scrollController.addListener(_onScroll);
    unawaited(_loadTrips(forceRefresh: true));
    _tripSubscription = DriverService.instance.tripEventsStream.listen((event) {
      if (event['status']?.toString().toUpperCase() == 'COMPLETED') {
        unawaited(_loadTrips(forceRefresh: true, silent: true));
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    _tripSubscription?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_loadTrips(forceRefresh: true, silent: true));
    }
  }

  void _onScroll() {
    if (!_scrollController.hasClients || _isLoadingMore || !_hasMore) return;
    if (_scrollController.position.extentAfter < 300) {
      unawaited(_loadTrips(loadMore: true));
    }
  }

  Future<void> _loadTrips({
    bool forceRefresh = false,
    bool loadMore = false,
    bool silent = false,
  }) async {
    if (_isFetching || (loadMore && !_hasMore)) return;
    _isFetching = true;
    final requestedPage = loadMore ? _page + 1 : 1;

    if (mounted) {
      setState(() {
        if (loadMore) {
          _isLoadingMore = true;
          _loadMoreError = null;
        } else if (!silent || _completedTrips.isEmpty) {
          _isLoading = true;
          _errorMessage = null;
        }
      });
    }

    try {
      final response = await DriverService.instance.getTrips(
        status: 'COMPLETED',
        page: requestedPage,
        limit: _pageSize,
        forceRefresh: forceRefresh || loadMore,
      );
      final completed = response.whereType<Map>().map((trip) => Map<String, dynamic>.from(trip)).where((trip) => trip['status']?.toString().toUpperCase() == 'COMPLETED').toList();

      if (!mounted) return;
      setState(() {
        if (requestedPage == 1) {
          _completedTrips = completed;
        } else {
          final knownIds = _completedTrips.map((trip) => trip['id']?.toString()).toSet();
          _completedTrips.addAll(
            completed.where((trip) => !knownIds.contains(trip['id']?.toString())),
          );
        }
        _page = requestedPage;
        _hasMore = response.length >= _pageSize;
        _errorMessage = null;
        _loadMoreError = null;
      });
    } catch (error) {
      if (mounted) {
        setState(() {
          final message = AppToast.cleanErrorMessage(error);
          if (loadMore) {
            _loadMoreError = message;
          } else {
            _errorMessage = message;
          }
        });
      }
    } finally {
      _isFetching = false;
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isLoadingMore = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    context.watch<LanguageProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final foreground = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final surface = isDark ? AppColors.bgDark : AppColors.bgLight;

    return Scaffold(
      backgroundColor: surface,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Column(
              children: [
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
                        tooltip: context.tr('Back'),
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.profileScreen);
                          }
                        },
                        icon: Icon(Icons.arrow_back_rounded, color: foreground),
                      ),
                      Expanded(
                        child: Text(
                          context.tr('Completed Trips'),
                          style: AppTypography.h2(
                            color: foreground,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: context.tr('Refresh completed trips'),
                        onPressed: () => _loadTrips(forceRefresh: true),
                        icon: Icon(Icons.refresh_rounded, color: foreground),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: _isLoading && _completedTrips.isEmpty
                      ? const Center(child: CircularProgressIndicator())
                      : RefreshIndicator(
                          onRefresh: () => _loadTrips(forceRefresh: true),
                          child: _buildTripList(isDark),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTripList(bool isDark) {
    if (_errorMessage != null && _completedTrips.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.xl),
        children: [
          const SizedBox(height: 100),
          Icon(Icons.cloud_off_rounded, size: 48, color: AppColors.error),
          const SizedBox(height: AppSpacing.md),
          Text(
            context.tr('Could not load completed trips'),
            textAlign: TextAlign.center,
            style: AppTypography.h3(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            _errorMessage!,
            textAlign: TextAlign.center,
            style: AppTypography.body(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Center(
            child: OutlinedButton.icon(
              onPressed: () => _loadTrips(forceRefresh: true),
              icon: const Icon(Icons.refresh_rounded),
              label: Text(context.tr('Try Again')),
            ),
          ),
        ],
      );
    }

    if (_completedTrips.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.xl),
        children: [
          const SizedBox(height: 110),
          Icon(
            Icons.check_circle_outline_rounded,
            size: 56,
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            context.tr('No Completed Trips Yet'),
            textAlign: TextAlign.center,
            style: AppTypography.h3(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            context.tr('Completed rides will appear here. Your current trip is available from Home.'),
            textAlign: TextAlign.center,
            style: AppTypography.body(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
          ),
        ],
      );
    }

    return ListView(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Text(
          context.tr('Completed Trips'),
          style: AppTypography.caption(
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        if (_errorMessage != null)
          Container(
            margin: const EdgeInsets.only(bottom: AppSpacing.md),
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Text(
              _errorMessage!,
              style: AppTypography.caption(color: AppColors.error),
            ),
          ),
        ..._completedTrips.map((trip) => _buildTripCard(trip, isDark)),
        if (_isLoadingMore)
          const Padding(
            padding: EdgeInsets.all(AppSpacing.lg),
            child: Center(child: CircularProgressIndicator()),
          ),
        if (_loadMoreError != null)
          TextButton.icon(
            onPressed: () => _loadTrips(loadMore: true),
            icon: const Icon(Icons.refresh_rounded),
            label: Text(context.tr('Could not load more trips. Tap to retry.')),
          ),
      ],
    );
  }

  Widget _buildTripCard(Map<String, dynamic> trip, bool isDark) {
    final requirement = _asMap(trip['requirement']);
    final pickup = _address(trip['pickupLocation']) ?? _address(requirement['pickupLocation']) ?? trip['pickupAddress']?.toString() ?? context.tr('Pickup Location');
    final drop = _address(trip['dropLocation']) ?? _address(requirement['dropLocation']) ?? trip['dropAddress']?.toString() ?? context.tr('Drop Location');
    final vehicle = (trip['vehicleType'] ?? requirement['vehicleType'] ?? 'Vehicle').toString();
    final completedAt = trip['completedAt']?.toString() ?? trip['updatedAt']?.toString();
    final payout = DriverService.resolveDriverPayoutFormatted(trip);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Material(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          onTap: () => context.push(
            AppRoutes.tripDetailsScreen,
            extra: trip,
          ),
          child: Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
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
                    Expanded(
                      child: Text(
                        context.tr('$vehicle Transfer'),
                        style: AppTypography.body(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Text(
                      payout,
                      style: AppTypography.body(
                        color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                if (completedAt != null && completedAt.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    _formatDate(completedAt),
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                _routeLine(Icons.circle, AppColors.accentGreenDark, pickup, isDark),
                const SizedBox(height: AppSpacing.sm),
                _routeLine(Icons.location_on_rounded, AppColors.error, drop, isDark),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Icon(
                      Icons.check_circle_rounded,
                      size: 16,
                      color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      context.tr('Completed'),
                      style: AppTypography.caption(
                        color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      context.tr('Details'),
                      style: AppTypography.caption(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.primary),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _routeLine(IconData icon, Color iconColor, String address, bool isDark) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 12, color: iconColor),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            address,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: AppTypography.caption(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
          ),
        ),
      ],
    );
  }

  Map<String, dynamic> _asMap(dynamic value) => value is Map ? Map<String, dynamic>.from(value) : const {};

  String? _address(dynamic location) {
    if (location is! Map) return null;
    final address = (location['address'] ?? location['formattedAddress'] ?? '').toString().trim();
    return address.isEmpty ? null : address;
  }

  String _formatDate(String value) {
    final date = DateTime.tryParse(value);
    if (date == null) return value;
    final local = date.toLocal();
    return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}';
  }
}
