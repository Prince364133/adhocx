/// What the employee sees about a ride. Derived only from server states
/// (@adhocx/contracts CorporateRequestStatus / CorporateRouteStatus / CorporateStopStatus)
/// plus the last realtime lifecycle event of this session.
enum EmployeeTripState {
  scheduled,
  planning,
  assigned,
  approaching,
  arrived,
  boarded,
  inProgress,
  completed,
  cancelled,
  unserved,
  noShow,
}

extension EmployeeTripStateText on EmployeeTripState {
  String get label => switch (this) {
        EmployeeTripState.scheduled => 'Scheduled',
        EmployeeTripState.planning => 'Planning route',
        EmployeeTripState.assigned => 'Cab assigned',
        EmployeeTripState.approaching => 'Cab on the way',
        EmployeeTripState.arrived => 'Cab arrived',
        EmployeeTripState.boarded => 'Boarded',
        EmployeeTripState.inProgress => 'In progress',
        EmployeeTripState.completed => 'Completed',
        EmployeeTripState.cancelled => 'Cancelled',
        EmployeeTripState.unserved => 'Not served',
        EmployeeTripState.noShow => 'No-show',
      };

  String get description => switch (this) {
        EmployeeTripState.scheduled => 'Your ride is on the roster. A route is planned before the shift.',
        EmployeeTripState.planning => 'Your route is being planned and a driver is being found.',
        EmployeeTripState.assigned => 'A driver and cab are assigned to your route.',
        EmployeeTripState.approaching => 'The driver has started and is heading to your pickup point.',
        EmployeeTripState.arrived => 'The cab is at your pickup point. It waits 5 minutes. Show your boarding OTP.',
        EmployeeTripState.boarded => 'Boarding confirmed.',
        EmployeeTripState.inProgress => 'You are on the way.',
        EmployeeTripState.completed => 'This ride is complete.',
        EmployeeTripState.cancelled => 'This ride was cancelled.',
        EmployeeTripState.unserved => 'No cab could be assigned for this ride. Contact your transport desk.',
        EmployeeTripState.noShow =>
          'You were marked a no-show: the cab waited 5 minutes at the pickup point and left.',
      };

  bool get isTerminal =>
      this == EmployeeTripState.completed ||
      this == EmployeeTripState.cancelled ||
      this == EmployeeTripState.unserved ||
      this == EmployeeTripState.noShow;

  /// Live tracking makes sense only from driver assignment until the ride ends.
  bool get isTrackable =>
      this == EmployeeTripState.assigned ||
      this == EmployeeTripState.approaching ||
      this == EmployeeTripState.arrived ||
      this == EmployeeTripState.boarded ||
      this == EmployeeTripState.inProgress;

  /// The boarding OTP is needed once the cab is coming and until boarding.
  bool get showsBoardingOtp =>
      this == EmployeeTripState.assigned ||
      this == EmployeeTripState.approaching ||
      this == EmployeeTripState.arrived;
}

/// Maps server states to [EmployeeTripState]. Precedence: per-employee outcome (stop) first,
/// then the request, then the route.
///
/// * [stopStatus]: PENDING | ARRIVED | BOARDED | NO_SHOW | CANCELLED (null when not routed yet)
/// * [routeStatus]: PLANNED | DISPATCHING | ASSIGNED | IN_TRANSIT | COMPLETED | CANCELLED
/// * [requestStatus]: APPROVED | PLANNED | ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED | RESCHEDULED | UNSERVED
/// * [lastLifecycle]: last realtime event for this stop (ASSIGNED, EN_ROUTE, APPROACHING, ARRIVED,
///   BOARDED, NO_SHOW, DROPPED, CAB_REPLACED, PICKUP_RETIMED)
EmployeeTripState mapTripState({
  String? stopStatus,
  String? routeStatus,
  String? requestStatus,
  String? lastLifecycle,
}) {
  final stop = stopStatus?.toUpperCase();
  final route = routeStatus?.toUpperCase();
  final request = requestStatus?.toUpperCase();
  final live = lastLifecycle?.toUpperCase();

  if (stop == 'NO_SHOW' || live == 'NO_SHOW') return EmployeeTripState.noShow;
  if (stop == 'CANCELLED' || request == 'CANCELLED') return EmployeeTripState.cancelled;
  if (request == 'UNSERVED') return EmployeeTripState.unserved;
  if (route == 'CANCELLED') return EmployeeTripState.cancelled;
  if (route == 'COMPLETED' || request == 'COMPLETED' || live == 'DROPPED') return EmployeeTripState.completed;

  if (stop == 'BOARDED') {
    // Just verified at the door (this session): show the confirmation, then "in progress".
    if (live == 'BOARDED') return EmployeeTripState.boarded;
    return route == 'IN_TRANSIT' ? EmployeeTripState.inProgress : EmployeeTripState.boarded;
  }
  if (stop == 'ARRIVED' || live == 'ARRIVED') return EmployeeTripState.arrived;

  if (route == 'IN_TRANSIT' || live == 'EN_ROUTE' || live == 'APPROACHING') {
    return EmployeeTripState.approaching;
  }
  if (route == 'ASSIGNED' || request == 'ASSIGNED' || live == 'ASSIGNED') return EmployeeTripState.assigned;
  if (route == 'PLANNED' || route == 'DISPATCHING' || request == 'PLANNED') return EmployeeTripState.planning;
  if (request == 'IN_PROGRESS') return EmployeeTripState.inProgress;
  return EmployeeTripState.scheduled;
}
