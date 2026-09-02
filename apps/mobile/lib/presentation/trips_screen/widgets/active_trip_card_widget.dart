import 'package:flutter/material.dart';
import '../trips_screen.dart';
import '../../../widgets/status_badge_widget.dart';

class ActiveTripCardWidget extends StatelessWidget {
  final Map<String, dynamic> trip;
  final TripStatus tripStatus;
  final VoidCallback onAction;
  final VoidCallback onArrivedAtPickup;

  const ActiveTripCardWidget({
    super.key,
    required this.trip,
    required this.tripStatus,
    required this.onAction,
    required this.onArrivedAtPickup,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              StatusBadgeWidget(label: _statusLabel, style: _statusBadgeStyle),
              Text(
                '₹${trip['payout']}',
                style: const TextStyle(
                  color: Color(0xFF10b981),
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Trip card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1e293b),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              children: [
                // Pickup
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.navigation_rounded,
                      color: Color(0xFF10b981),
                      size: 18,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Pickup',
                            style: TextStyle(
                              color: Color(0xFF94a3b8),
                              fontSize: 11,
                            ),
                          ),
                          Text(
                            trip['pickup'] as String,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 8, top: 4, bottom: 4),
                  child: Row(
                    children: [
                      Container(
                        width: 2,
                        height: 20,
                        color: const Color(0xFF334155),
                      ),
                    ],
                  ),
                ),
                // Drop
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.location_pin,
                      color: Color(0xFFef4444),
                      size: 18,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Drop',
                            style: TextStyle(
                              color: Color(0xFF94a3b8),
                              fontSize: 11,
                            ),
                          ),
                          Text(
                            trip['drop'] as String,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(color: Color(0xFF334155)),
                const SizedBox(height: 12),
                // Meta row
                Row(
                  children: [
                    _metaChip(
                      Icons.straighten_rounded,
                      trip['distance'] as String,
                    ),
                    const SizedBox(width: 8),
                    _metaChip(
                      Icons.directions_car_rounded,
                      trip['vehicle_type'] as String,
                    ),
                    const SizedBox(width: 8),
                    _metaChip(
                      Icons.person_outline_rounded,
                      trip['passenger_name'] as String,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Action buttons
          ..._buildActionButtons(),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  List<Widget> _buildActionButtons() {
    switch (tripStatus) {
      case TripStatus.assigned:
        return [
          _actionBtn(
            label: 'Navigate to Pickup',
            icon: Icons.navigation_rounded,
            color: const Color(0xFF0ea5e9),
            onTap: () {
              // TODO: Open Google Maps with pickup coordinates in production
              // url_launcher: launch('https://www.google.com/maps/dir/?api=1&destination=${trip['pickup_lat']},${trip['pickup_lng']}')
            },
          ),
          const SizedBox(height: 12),
          _actionBtn(
            label: 'Arrived at Pickup',
            icon: Icons.location_on_rounded,
            color: const Color(0xFFf59e0b),
            onTap: onArrivedAtPickup,
          ),
        ];
      case TripStatus.arrived:
        return [
          _actionBtn(
            label: 'Start Trip (Enter OTP)',
            icon: Icons.play_circle_rounded,
            color: const Color(0xFF10b981),
            onTap: onAction,
          ),
        ];
      case TripStatus.inProgress:
        return [
          _actionBtn(
            label: 'End Trip (Enter OTP)',
            icon: Icons.stop_circle_rounded,
            color: const Color(0xFFef4444),
            onTap: onAction,
          ),
        ];
    }
  }

  Widget _actionBtn({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: ElevatedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 18),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
    );
  }

  Widget _metaChip(IconData icon, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
        decoration: BoxDecoration(
          color: const Color(0xFF0f172a),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: const Color(0xFF94a3b8), size: 12),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                label,
                style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 11),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String get _statusLabel => switch (tripStatus) {
    TripStatus.assigned => 'Active Trip (ASSIGNED)',
    TripStatus.arrived => 'Active Trip (ARRIVED)',
    TripStatus.inProgress => 'Active Trip (IN PROGRESS)',
  };

  BadgeStyle get _statusBadgeStyle => switch (tripStatus) {
    TripStatus.assigned => BadgeStyle.info,
    TripStatus.arrived => BadgeStyle.warning,
    TripStatus.inProgress => BadgeStyle.success,
  };
}
