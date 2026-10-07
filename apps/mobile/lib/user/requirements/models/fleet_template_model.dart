import 'cab_cart_item.dart';

class FleetTemplate {
  final String id;
  final String name;
  final List<CabCartItem> cabs;
  final DateTime createdAt;
  final DateTime? lastRunAt;
  final String? notes;

  FleetTemplate({
    required this.id,
    required this.name,
    required this.cabs,
    required this.createdAt,
    this.lastRunAt,
    this.notes,
  });

  int get totalCabsCount => cabs.length;

  double get totalEstimatedFare =>
      cabs.fold(0.0, (sum, cab) => sum + cab.estimatedFare);

  /// Human-readable vehicle breakdown, e.g. "3x Sedan, 2x SUV"
  String get vehicleSummary {
    if (cabs.isEmpty) return '0 Vehicles';
    final Map<String, int> counts = {};
    for (final cab in cabs) {
      final type = cab.vehicleLabel.isNotEmpty ? cab.vehicleLabel : cab.vehicleType;
      counts[type] = (counts[type] ?? 0) + 1;
    }
    return counts.entries.map((e) => '${e.value}x ${e.key}').join(', ');
  }

  /// Summary of routes in the template
  String get routeSummary {
    if (cabs.isEmpty) return 'No routes';
    if (cabs.length == 1) return cabs.first.routeSummary;
    final firstPickup = cabs.first.pickupShort;
    return '$firstPickup → ${cabs.length} destinations';
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'cabs': cabs.map((c) => c.toJson()).toList(),
    'createdAt': createdAt.toIso8601String(),
    'lastRunAt': lastRunAt?.toIso8601String(),
    'notes': notes,
  };

  factory FleetTemplate.fromJson(Map<String, dynamic> json) {
    DateTime created;
    try {
      created = DateTime.parse(json['createdAt']?.toString() ?? '');
    } catch (_) {
      created = DateTime.now();
    }

    DateTime? lastRun;
    if (json['lastRunAt'] != null) {
      try {
        lastRun = DateTime.parse(json['lastRunAt'].toString());
      } catch (_) {}
    }

    final rawCabs = json['cabs'] as List? ?? [];
    final parsedCabs = rawCabs
        .map((c) => CabCartItem.fromJson(Map<String, dynamic>.from(c as Map)))
        .toList();

    return FleetTemplate(
      id: json['id']?.toString() ?? 'tmpl_${DateTime.now().millisecondsSinceEpoch}',
      name: json['name']?.toString() ?? 'Corporate Fleet Template',
      cabs: parsedCabs,
      createdAt: created,
      lastRunAt: lastRun,
      notes: json['notes']?.toString(),
    );
  }

  FleetTemplate copyWith({
    String? id,
    String? name,
    List<CabCartItem>? cabs,
    DateTime? createdAt,
    DateTime? lastRunAt,
    String? notes,
  }) {
    return FleetTemplate(
      id: id ?? this.id,
      name: name ?? this.name,
      cabs: cabs ?? List.from(this.cabs),
      createdAt: createdAt ?? this.createdAt,
      lastRunAt: lastRunAt ?? this.lastRunAt,
      notes: notes ?? this.notes,
    );
  }
}
