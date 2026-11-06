import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/app_toast.dart';
import '../../routes/app_routes.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_confirmation_dialog.dart';
import '../../shared/widgets/app_primary_button.dart';
import '../../shared/widgets/app_secondary_button.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import 'corporate_navigation.dart';
import 'data/corporate_errors.dart';
import 'data/corporate_models.dart';
import 'logic/corporate_device.dart';
import 'logic/corporate_ets_coordinator.dart';
import 'logic/corporate_realtime_client.dart';
import 'widgets/corporate_sos_sheet.dart';
import 'widgets/corporate_state_views.dart';
import 'widgets/stop_boarding_panel.dart';

enum _Action { start, arrive, complete, drop, safeConfirm }

/// Active corporate route (UI-05-01/02/04, DRV-09/10): ordered stops, start, navigate,
/// geofenced arrival, 5-minute wait with OTP boarding / no-show, completion, SOS.
class CorporateActiveRouteScreen extends StatefulWidget {
  const CorporateActiveRouteScreen({
    super.key,
    this.coordinator,
    this.device,
    this.navigationLauncher = launchCorporateNavigation,
  });

  final CorporateEtsCoordinator? coordinator;
  final CorporateDevice? device;
  final Future<bool> Function(double lat, double lng) navigationLauncher;

  @override
  State<CorporateActiveRouteScreen> createState() => _CorporateActiveRouteScreenState();
}

class _CorporateActiveRouteScreenState extends State<CorporateActiveRouteScreen> {
  late final CorporateEtsCoordinator _coordinator = widget.coordinator ?? CorporateEtsCoordinator.instance;
  late final CorporateDevice _device = widget.device ?? const DefaultCorporateDevice();

  bool _loading = true;
  CorporateError? _loadError;
  bool _staleOffline = false;
  CorporateActiveRoute? _route;
  bool _completed = false;
  _Action? _busy;
  CorporateError? _actionError;
  StreamSubscription<CorporateRealtimeEvent>? _eventsSub;

  @override
  void initState() {
    super.initState();
    _load();
    _eventsSub = _coordinator.events.listen((e) {
      if (!mounted) return;
      const relevant = {
        'STOP_WAIT_TIMER_STARTED',
        'PASSENGER_BOARDED',
        'STOP_MARKED_NO_SHOW',
        'CORPORATE_ROUTE_CONFIRMED',
        'CORPORATE_ROUTE_UNASSIGNED',
      };
      if (relevant.contains(e.event) && (e.routeId == null || _route == null || e.routeId == _route!.routeId)) {
        _load(silent: true);
      }
    });
  }

  @override
  void dispose() {
    _eventsSub?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _loadError = null;
      });
    }
    try {
      final raw = await _coordinator.api.getActiveRoute();
      var route = CorporateActiveRoute.fromJson(raw);
      if (route != null) {
        try {
          route = route.withWaypoints(await _coordinator.api.getWaypoints(route.routeId));
        } catch (_) {
          // Waypoints only add stop types and pickup addresses; the route stays usable without them.
        }
      }
      if (!mounted) return;
      setState(() {
        _route = route;
        _loading = false;
        _loadError = null;
        _staleOffline = false;
      });
      _coordinator.syncActiveRoute(route);
    } catch (e) {
      if (!mounted) return;
      final err = CorporateError.from(e);
      setState(() {
        _loading = false;
        if (_route != null && err.isOffline) {
          _staleOffline = true;
        } else if (_route == null) {
          _loadError = err;
        } else {
          _actionError = err;
        }
      });
    }
  }

  Future<void> _startRoute(CorporateActiveRoute route) async {
    final confirmed = await AppConfirmationDialog.show(
      context,
      icon: Icons.play_circle_fill_rounded,
      title: 'Start route?',
      message: route.isLogout
          ? 'Start when you are leaving for the office. Employees are notified with their ETA.'
          : 'Start when you are driving to pickup 1. Every employee is notified with their ETA.',
      confirmText: 'Start route',
      onConfirm: () {},
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _busy = _Action.start;
      _actionError = null;
    });
    CorporateFix? fix;
    try {
      fix = await _device.currentFix();
    } catch (_) {}
    try {
      await _coordinator.api.startRoute(route.routeId, lat: fix?.latitude, lng: fix?.longitude);
      if (mounted) AppToast.showSuccess('Route started. Drive safely.', context: context);
    } catch (e) {
      if (mounted) setState(() => _actionError = CorporateError.from(e));
    } finally {
      if (mounted) setState(() => _busy = null);
      await _load(silent: true);
    }
  }

  Future<void> _arrive(CorporateActiveRoute route, CorporateStop stop) async {
    setState(() {
      _busy = _Action.arrive;
      _actionError = null;
    });
    try {
      final fix = await _device.currentFix();
      if (fix == null) {
        throw CorporateError(
          CorporateErrorKind.rejected,
          'Current location is unavailable. Turn on GPS and allow location access, then tap Arrived again.',
        );
      }
      final res = await _coordinator.api.arriveAtStop(route.routeId, stop.stopId, lat: fix.latitude, lng: fix.longitude);
      final serverArrival = parseServerTime(asJsonMap(unwrapData(res))['actualArrivalTime']);
      if (serverArrival != null) _coordinator.recordArrival(stop.stopId, serverArrival, _coordinator.now());
      if (mounted) {
        AppToast.showSuccess(
          stop.isDropoff ? 'Arrival recorded.' : 'Arrived. The 5-minute wait has started.',
          context: context,
        );
      }
    } catch (e) {
      if (mounted) setState(() => _actionError = CorporateError.from(e));
    } finally {
      if (mounted) setState(() => _busy = null);
      await _load(silent: true);
    }
  }

  Future<void> _dropPassenger(CorporateActiveRoute route, CorporateStop stop) async {
    setState(() {
      _busy = _Action.drop;
      _actionError = null;
    });
    try {
      final fix = await _device.currentFix();
      if (fix == null) {
        throw CorporateError(
          CorporateErrorKind.rejected,
          'Current location is unavailable. Turn on GPS and allow location access, then tap Confirm Drop again.',
        );
      }
      await _coordinator.api.dropPassenger(route.routeId, stop.stopId, lat: fix.latitude, lng: fix.longitude);
      if (mounted) {
        AppToast.showSuccess('Drop recorded. Safe-arrival verification active.', context: context);
      }
    } catch (e) {
      if (mounted) setState(() => _actionError = CorporateError.from(e));
    } finally {
      if (mounted) setState(() => _busy = null);
      await _load(silent: true);
    }
  }

  Future<void> _confirmSafeDrop(CorporateActiveRoute route, CorporateStop stop) async {
    setState(() {
      _busy = _Action.safeConfirm;
      _actionError = null;
    });
    try {
      await _coordinator.api.confirmSafeDrop(route.routeId, stop.stopId);
      if (mounted) {
        AppToast.showSuccess('Safe sight-of-entry escort recorded.', context: context);
      }
    } catch (e) {
      if (mounted) setState(() => _actionError = CorporateError.from(e));
    } finally {
      if (mounted) setState(() => _busy = null);
      await _load(silent: true);
    }
  }

  Future<void> _complete(CorporateActiveRoute route) async {
    final confirmed = await AppConfirmationDialog.show(
      context,
      icon: Icons.flag_circle_rounded,
      iconColor: AppColors.success,
      title: 'Complete route?',
      message: 'Confirm that the cab has reached ${route.office?.name ?? 'the destination'} and the trip is over.',
      confirmText: 'Complete route',
      onConfirm: () {},
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _busy = _Action.complete;
      _actionError = null;
    });
    try {
      await _coordinator.api.completeRoute(route.routeId);
      _coordinator.syncActiveRoute(null);
      unawaited(_coordinator.refreshDuties().then((_) {}, onError: (_) {}));
      if (!mounted) return;
      setState(() {
        _completed = true;
        _route = null;
      });
    } catch (e) {
      if (mounted) setState(() => _actionError = CorporateError.from(e));
      await _load(silent: true);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _navigateTo(double? lat, double? lng) async {
    if (lat == null || lng == null) {
      AppToast.showWarning('Coordinates for this stop are not available.', context: context);
      return;
    }
    final ok = await widget.navigationLauncher(lat, lng);
    if (!ok && mounted) AppToast.showWarning('Could not open Google Maps on this device.', context: context);
  }

  Future<void> _onStopUpdated(String message) async {
    if (mounted) AppToast.showSuccess(message, context: context);
    await _load(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final route = _route;
    return Scaffold(
      backgroundColor: CorporateSurface.bg(context),
      appBar: AppBar(
        title: Text(route?.routeNumber ?? 'Corporate route'),
        actions: [
          if (route != null)
            Padding(
              padding: const EdgeInsets.only(right: AppSpacing.sm),
              child: TextButton.icon(
                key: const Key('corporate-sos-button'),
                style: TextButton.styleFrom(
                  backgroundColor: AppColors.error,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(72, 40),
                  shape: RoundedRectangleBorder(borderRadius: AppRadius.borderPill),
                ),
                onPressed: () => CorporateSosSheet.show(
                  context,
                  routeId: route.routeId,
                  stopId: route.currentStop?.stopId,
                  api: _coordinator.api,
                  device: _device,
                ),
                icon: const Icon(Icons.sos_rounded, size: 18),
                label: const Text('SOS'),
              ),
            ),
        ],
      ),
      body: SafeArea(child: _buildBody(context)),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_loading && _route == null) return const CorporateStateView.loading();
    if (_loadError != null && _route == null) {
      return CorporateStateView.error(error: _loadError!, onRetry: () => _load());
    }
    final route = _route;
    if (route == null) {
      if (_completed) {
        return CorporateStateView.empty(
          emptyIcon: Icons.verified_rounded,
          emptyTitle: 'Route completed',
          emptyDescription: 'The server confirmed the route as completed. Your earning is added to corporate earnings.',
          emptyActionText: 'View corporate earnings',
          onEmptyAction: () => context.pushReplacement(AppRoutes.corporateEarningsScreen),
        );
      }
      return CorporateStateView.empty(
        emptyIcon: Icons.route_outlined,
        emptyTitle: 'No active corporate route',
        emptyDescription: 'When you accept a corporate route offer it appears here on the day of the duty.',
        emptyActionText: 'View corporate duties',
        onEmptyAction: () => context.pushReplacement(AppRoutes.corporateDutiesScreen),
      );
    }

    final current = route.currentStop;
    return RefreshIndicator(
      onRefresh: () => _load(silent: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        children: [
          if (_staleOffline) CorporateOfflineBanner(onRetry: () => _load(silent: true)),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _RouteHeader(route: route, now: _coordinator.now()),
                const SizedBox(height: AppSpacing.lg),
                if (_actionError != null) ...[
                  CorporateInlineError(error: _actionError!),
                  const SizedBox(height: AppSpacing.md),
                ],
                _buildCurrentAction(context, route, current),
                const SizedBox(height: AppSpacing.xl),
                Text(
                  'Stops',
                  style: AppTypography.h4(color: CorporateSurface.text(context), fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: AppSpacing.sm),
                for (final s in route.stops)
                  _StopRow(stop: s, isCurrent: s.stopId == current?.stopId, office: route.office),
                const SizedBox(height: AppSpacing.huge),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentAction(BuildContext context, CorporateActiveRoute route, CorporateStop? current) {
    if (route.isAssigned) {
      return AppCard(
        backgroundColor: CorporateSurface.card(context),
        borderColor: CorporateSurface.border(context),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              route.isLogout ? 'Head to the office' : 'Head to pickup 1',
              style: AppTypography.h4(color: CorporateSurface.text(context), fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              route.isLogout
                  ? 'Report at ${route.office?.name ?? 'the office'} by ${formatClock(route.targetPickup1Time)}.'
                  : 'Reach pickup 1 by ${formatClock(route.targetPickup1Time)}. Start the route when you leave.',
              style: AppTypography.small(color: CorporateSurface.muted(context)),
              overflow: TextOverflow.visible,
            ),
            const SizedBox(height: AppSpacing.lg),
            AppPrimaryButton(
              key: const Key('corporate-start-route'),
              text: 'Start route',
              icon: Icons.play_arrow_rounded,
              height: 56,
              isLoading: _busy == _Action.start,
              onPressed: _busy != null ? null : () => _startRoute(route),
            ),
            const SizedBox(height: AppSpacing.md),
            AppSecondaryButton(
              text: route.isLogout ? 'Navigate to office' : 'Navigate to pickup 1',
              icon: Icons.navigation_rounded,
              onPressed: () {
                if (route.isLogout || route.stops.isEmpty) {
                  _navigateTo(route.office?.latitude, route.office?.longitude);
                } else {
                  _navigateTo(route.stops.first.latitude, route.stops.first.longitude);
                }
              },
            ),
          ],
        ),
      );
    }

    if (current == null) {
      return AppCard(
        backgroundColor: CorporateSurface.card(context),
        borderColor: CorporateSurface.border(context),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'All stops handled',
              style: AppTypography.h4(color: CorporateSurface.text(context), fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Complete the route when you reach ${route.office?.name ?? 'the destination'}.',
              style: AppTypography.small(color: CorporateSurface.muted(context)),
              overflow: TextOverflow.visible,
            ),
            const SizedBox(height: AppSpacing.lg),
            if (!route.isLogout) ...[
              AppSecondaryButton(
                text: 'Navigate to office',
                icon: Icons.navigation_rounded,
                onPressed: () => _navigateTo(route.office?.latitude, route.office?.longitude),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
            AppPrimaryButton(
              key: const Key('corporate-complete-route'),
              text: 'Complete route',
              icon: Icons.flag_rounded,
              variant: AppButtonVariant.accentGreen,
              height: 56,
              isLoading: _busy == _Action.complete,
              onPressed: (_busy != null || !route.canComplete) ? null : () => _complete(route),
            ),
          ],
        ),
      );
    }

    final title = current.isDropoff
        ? (current.employeeName != null ? 'Drop ${current.employeeName}' : 'Office drop')
        : 'Pickup ${current.employeeName ?? 'stop ${current.sequence}'}';
    return AppCard(
      backgroundColor: CorporateSurface.card(context),
      borderColor: AppColors.primary.withValues(alpha: 0.6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Stop ${current.sequence} of ${route.stops.length}',
            style: AppTypography.micro(color: AppColors.primary, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            title,
            key: const Key('corporate-current-stop-title'),
            style: AppTypography.h3(color: CorporateSurface.text(context), fontWeight: FontWeight.bold),
          ),
          if (current.pickupPoint != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              current.pickupPoint!,
              style: AppTypography.small(color: CorporateSurface.muted(context)),
              overflow: TextOverflow.visible,
            ),
          ],
          if (current.plannedEta != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Planned ${formatClock(current.plannedEta)}',
              style: AppTypography.caption(color: CorporateSurface.muted(context)),
            ),
          ],
          const SizedBox(height: AppSpacing.lg),
          if (current.awaitsBoarding)
            StopBoardingPanel(
              routeId: route.routeId,
              stop: current,
              coordinator: _coordinator,
              device: _device,
              onStopUpdated: _onStopUpdated,
            )
          else if (current.awaitsDrop) ...[
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: AppRadius.borderMd,
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.shield_outlined, color: AppColors.primary, size: 20),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Destination reached. Confirm drop-off and ensure commuter safe entry.',
                      style: AppTypography.caption(color: CorporateSurface.text(context)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            AppPrimaryButton(
              key: const Key('corporate-drop-passenger'),
              text: 'Confirm Passenger Dropped',
              icon: Icons.check_circle_outline_rounded,
              height: 56,
              isLoading: _busy == _Action.drop,
              onPressed: _busy != null ? null : () => _dropPassenger(route, current),
            ),
            const SizedBox(height: AppSpacing.sm),
            AppSecondaryButton(
              key: const Key('corporate-safe-escort-confirm'),
              text: 'Confirm Safe Sight-of-Entry Escort',
              icon: Icons.verified_user_rounded,
              isLoading: _busy == _Action.safeConfirm,
              onPressed: _busy != null ? null : () => _confirmSafeDrop(route, current),
            ),
          ] else ...[
            AppSecondaryButton(
              key: const Key('corporate-navigate-stop'),
              text: 'Navigate',
              icon: Icons.navigation_rounded,
              onPressed: () => _navigateTo(current.latitude, current.longitude),
            ),
            const SizedBox(height: AppSpacing.md),
            AppPrimaryButton(
              key: const Key('corporate-arrive'),
              text: 'Arrived',
              icon: Icons.where_to_vote_rounded,
              height: 56,
              isLoading: _busy == _Action.arrive,
              onPressed: _busy != null ? null : () => _arrive(route, current),
            ),
          ],
        ],
      ),
    );
  }
}

class _RouteHeader extends StatelessWidget {
  const _RouteHeader({required this.route, required this.now});
  final CorporateActiveRoute route;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final target = route.targetPickup1Time;
    final late = route.isAssigned && target != null && now.isAfter(target);
    return AppCard(
      backgroundColor: CorporateSurface.card(context),
      borderColor: CorporateSurface.border(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${route.direction ?? 'Corporate'} • Shift ${route.shiftTime ?? '--'}',
                  style: AppTypography.h4(color: CorporateSurface.text(context), fontWeight: FontWeight.bold),
                ),
              ),
              AppBadge(
                label: route.isInTransit ? 'IN TRANSIT' : route.status,
                variant: route.isInTransit ? AppBadgeVariant.success : AppBadgeVariant.info,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '${route.stops.length} stops • ${route.assignedPassengerCount ?? '--'} passengers'
            '${route.office?.name != null ? ' • ${route.office!.name}' : ''}',
            style: AppTypography.small(color: CorporateSurface.muted(context)),
            overflow: TextOverflow.visible,
          ),
          if (target != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              route.isLogout ? 'Report at office by ${formatClock(target)}' : 'Pickup 1 by ${formatClock(target)}',
              key: const Key('corporate-pickup1-target'),
              style: AppTypography.body(color: late ? AppColors.error : AppColors.primary, fontWeight: FontWeight.bold),
            ),
            if (late)
              Text(
                'You are past the target time. Start now and contact support if you are delayed.',
                style: AppTypography.caption(color: AppColors.error),
                overflow: TextOverflow.visible,
              ),
          ],
        ],
      ),
    );
  }
}

class _StopRow extends StatelessWidget {
  const _StopRow({required this.stop, required this.isCurrent, this.office});
  final CorporateStop stop;
  final bool isCurrent;
  final CorporateOffice? office;

  @override
  Widget build(BuildContext context) {
    final (label, variant) = switch (stop.status) {
      CorporateStopStatus.pending => ('Pending', AppBadgeVariant.neutral),
      CorporateStopStatus.arrived => ('Arrived', AppBadgeVariant.warning),
      CorporateStopStatus.boarded => ('Boarded', AppBadgeVariant.success),
      CorporateStopStatus.noShow => ('No-show', AppBadgeVariant.error),
      CorporateStopStatus.completed => ('Done', AppBadgeVariant.success),
      CorporateStopStatus.dropped => ('Dropped', AppBadgeVariant.info),
      CorporateStopStatus.safeConfirmed => ('Safe Reached', AppBadgeVariant.success),
      CorporateStopStatus.cancelled => ('Cancelled', AppBadgeVariant.error),
      CorporateStopStatus.unknown => (stop.rawStatus, AppBadgeVariant.info),
    };
    final name = stop.employeeName ?? (stop.isDropoff ? (office?.name ?? 'Drop') : 'Stop ${stop.sequence}');
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: AppSpacing.paddingMd,
      decoration: BoxDecoration(
        color: CorporateSurface.card(context),
        borderRadius: AppRadius.borderLg,
        border: Border.all(
          color: isCurrent ? AppColors.primary : CorporateSurface.border(context),
          width: isCurrent ? 1.6 : 1,
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: isCurrent ? AppColors.primary : CorporateSurface.border(context),
            child: Text(
              '${stop.sequence}',
              style: AppTypography.caption(color: isCurrent ? Colors.white : CorporateSurface.text(context), fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: AppTypography.body(color: CorporateSurface.text(context), fontWeight: FontWeight.w600),
                ),
                Text(
                  [
                    if (stop.isDropoff) 'Drop' else 'Pickup',
                    if (stop.pickupPoint != null) stop.pickupPoint!,
                    if (stop.plannedEta != null) formatClock(stop.plannedEta),
                  ].join(' • '),
                  style: AppTypography.caption(color: CorporateSurface.muted(context)),
                  maxLines: 2,
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          AppBadge(label: label, variant: variant),
        ],
      ),
    );
  }
}
