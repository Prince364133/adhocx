class DriverRatingTrip {
  final String stopId;
  final String routeId;
  final String routeStatus;
  final String stopStatus;
  final String shiftDate;
  final String shiftTime;
  final String direction;
  final String pickupAddress;
  final String destinationAddress;
  final String driverId;
  final String driverName;
  final double? driverRating;
  final String? driverPhotoUrl;
  final String vehicleModel;
  final String vehiclePlate;
  final bool hasFeedback;
  final int? feedbackRating;

  const DriverRatingTrip({
    required this.stopId,
    required this.routeId,
    required this.routeStatus,
    required this.stopStatus,
    required this.shiftDate,
    required this.shiftTime,
    required this.direction,
    required this.pickupAddress,
    required this.destinationAddress,
    required this.driverId,
    required this.driverName,
    required this.driverRating,
    required this.driverPhotoUrl,
    required this.vehicleModel,
    required this.vehiclePlate,
    required this.hasFeedback,
    required this.feedbackRating,
  });

  static DriverRatingTrip? tryParse(dynamic value) {
    if (value is! Map) return null;

    final map = Map<String, dynamic>.from(value);
    final driver = map['driver'] is Map
        ? Map<String, dynamic>.from(map['driver'] as Map)
        : <String, dynamic>{};
    final vehicle = map['vehicle'] is Map
        ? Map<String, dynamic>.from(map['vehicle'] as Map)
        : <String, dynamic>{};
    final stopId = map['stopId']?.toString() ?? '';
    final routeId = map['routeId']?.toString() ?? '';

    if (stopId.isEmpty || routeId.isEmpty) return null;

    final ratingValue = driver['rating'];
    final feedbackRatingValue = map['feedbackRating'];

    return DriverRatingTrip(
      stopId: stopId,
      routeId: routeId,
      routeStatus: map['routeStatus']?.toString() ?? '',
      stopStatus: map['status']?.toString() ?? '',
      shiftDate: map['shiftDate']?.toString() ?? '',
      shiftTime: map['shiftTime']?.toString() ?? '',
      direction: map['direction']?.toString() ?? '',
      pickupAddress: map['pickupAddress']?.toString() ?? '',
      destinationAddress: map['destinationAddress']?.toString() ?? '',
      driverId: driver['id']?.toString() ?? map['driverId']?.toString() ?? '',
      driverName: driver['fullName']?.toString() ?? '',
      driverRating: ratingValue is num ? ratingValue.toDouble() : null,
      driverPhotoUrl: driver['photoUrl']?.toString(),
      vehicleModel: vehicle['model']?.toString() ?? '',
      vehiclePlate: vehicle['plateNumber']?.toString() ?? '',
      hasFeedback: map['hasFeedback'] == true,
      feedbackRating:
          feedbackRatingValue is num ? feedbackRatingValue.toInt() : null,
    );
  }

  bool get isCompleted => routeStatus.toUpperCase() == 'COMPLETED';

  bool get canRate =>
      isCompleted && !hasFeedback && stopId.isNotEmpty && driverId.isNotEmpty;

  bool get isDrop => direction.toUpperCase() == 'LOGOUT';

  String get title => isDrop ? 'Logout Trip' : 'Login Trip';

  String get displayStatus {
    switch (routeStatus.toUpperCase()) {
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
      case 'CANCELED':
        return 'Cancelled';
      case 'IN_TRANSIT':
        return 'In Progress';
      case 'DISPATCHING':
        return 'Dispatching';
      case 'ASSIGNED':
        return 'Assigned';
      case 'PLANNED':
        return 'Scheduled';
      default:
        final value = routeStatus.replaceAll('_', ' ').toLowerCase();
        if (value.isEmpty) return stopStatus;
        return value[0].toUpperCase() + value.substring(1);
    }
  }

  String get displayDate {
    final date = DateTime.tryParse(shiftDate);
    if (date == null) return shiftDate;
    const months = [
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
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }

  Map<String, dynamic> toJson() => {
        'stopId': stopId,
        'routeId': routeId,
        'routeStatus': routeStatus,
        'isCompleted': isCompleted,
        'status': stopStatus,
        'shiftDate': shiftDate,
        'shiftTime': shiftTime,
        'direction': direction,
        'pickupAddress': pickupAddress,
        'destinationAddress': destinationAddress,
        'driverId': driverId,
        'driver': {
          'id': driverId,
          'fullName': driverName,
          'rating': driverRating,
          'photoUrl': driverPhotoUrl,
        },
        'vehicle': {
          'model': vehicleModel,
          'plateNumber': vehiclePlate,
        },
        'hasFeedback': hasFeedback,
        'feedbackRating': feedbackRating,
      };
}
