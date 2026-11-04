import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Vector illustrations and custom map canvases for Batch 05 (Live Tracking & Navigation)

/// 1. Vector Live Map Canvas (Realistic simulated interactive route map)
class VectorLiveMapCanvas extends StatelessWidget {
  final double height;
  final bool showControls;
  final String? etaBadge;

  const VectorLiveMapCanvas({
    super.key,
    this.height = 240,
    this.showControls = false,
    this.etaBadge,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9), // Map background
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Stack(
          children: [
            // Custom Painter for streets, road grid, and polyline
            Positioned.fill(
              child: CustomPaint(
                painter: _MapGridRoutePainter(),
              ),
            ),

            // Start Pickup Pin (Green)
            const Positioned(
              left: 48,
              bottom: 48,
              child: _MapPinBadge(
                color: AppColors.success,
                icon: Icons.person_pin_circle_rounded,
              ),
            ),

            // Moving Cab Marker (along polyline)
            const Positioned(
              left: 140,
              top: 86,
              child: _CabMarkerBadge(),
            ),

            // Destination Pin (Orange)
            const Positioned(
              right: 48,
              top: 36,
              child: _MapPinBadge(
                color: AppColors.secondaryOrange,
                icon: Icons.business_rounded,
              ),
            ),

            // ETA floating pill
            if (etaBadge != null)
              Positioned(
                left: 110,
                top: 130,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primaryBlue,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryBlue.withOpacity(0.35),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Text(
                    etaBadge!,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),

            // Map floating controls
            if (showControls)
              Positioned(
                right: 14,
                top: 14,
                child: Column(
                  children: [
                    _buildMapControlBtn(Icons.layers_rounded, () {}),
                    const SizedBox(height: 8),
                    _buildMapControlBtn(Icons.my_location_rounded, () {}),
                    const SizedBox(height: 8),
                    _buildMapControlBtn(Icons.add_rounded, () {}),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMapControlBtn(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.95),
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Icon(icon, size: 18, color: AppColors.textPrimary),
      ),
    );
  }
}

class _MapGridRoutePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final streetPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    final minorStreetPaint = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..strokeWidth = 3;

    // Background road grid lines
    canvas.drawLine(Offset(0, size.height * 0.3), Offset(size.width, size.height * 0.3), streetPaint);
    canvas.drawLine(Offset(0, size.height * 0.7), Offset(size.width, size.height * 0.7), streetPaint);
    canvas.drawLine(Offset(size.width * 0.25, 0), Offset(size.width * 0.25, size.height), streetPaint);
    canvas.drawLine(Offset(size.width * 0.65, 0), Offset(size.width * 0.65, size.height), streetPaint);

    // Minor lanes
    canvas.drawLine(Offset(0, size.height * 0.5), Offset(size.width, size.height * 0.5), minorStreetPaint);
    canvas.drawLine(Offset(size.width * 0.45, 0), Offset(size.width * 0.45, size.height), minorStreetPaint);

    // Active Route Polyline (Blue)
    final routePaint = Paint()
      ..color = AppColors.primaryBlue
      ..strokeWidth = 4.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final routePath = Path();
    routePath.moveTo(60, size.height - 60);
    routePath.lineTo(size.width * 0.25, size.height * 0.7);
    routePath.lineTo(size.width * 0.45, size.height * 0.7);
    routePath.lineTo(size.width * 0.45, size.height * 0.3);
    routePath.lineTo(size.width - 60, 48);

    canvas.drawPath(routePath, routePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _MapPinBadge extends StatelessWidget {
  final Color color;
  final IconData icon;

  const _MapPinBadge({required this.color, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.35),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Icon(icon, size: 16, color: Colors.white),
    );
  }
}

class _CabMarkerBadge extends StatelessWidget {
  const _CabMarkerBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: const Icon(Icons.directions_car_filled_rounded, size: 18, color: AppColors.primaryBlue),
    );
  }
}

/// 2. Walking Path Graphic (Perspective walkway with directional arrows)
class WalkingPathGraphic extends StatelessWidget {
  const WalkingPathGraphic({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 280,
      decoration: BoxDecoration(
        color: const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background landscape & road
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFFCBD5E1), Color(0xFFF1F5F9)],
              ),
            ),
          ),

          // Pathway overlay
          Positioned(
            bottom: 0,
            child: Container(
              width: 140,
              height: 220,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFF94A3B8), Color(0xFF64748B)],
                ),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: const [
                  Icon(Icons.keyboard_arrow_up_rounded, size: 36, color: AppColors.primaryBlueLight),
                  Icon(Icons.keyboard_arrow_up_rounded, size: 42, color: AppColors.primaryBlue),
                  Icon(Icons.keyboard_arrow_up_rounded, size: 48, color: Colors.white),
                ],
              ),
            ),
          ),

          // Street surroundings
          Positioned(
            left: 20,
            top: 40,
            child: Row(
              children: const [
                Icon(Icons.park_rounded, size: 32, color: Color(0xFF16A34A)),
                SizedBox(width: 8),
                Icon(Icons.apartment_rounded, size: 36, color: Color(0xFF64748B)),
              ],
            ),
          ),
          Positioned(
            right: 20,
            top: 40,
            child: Row(
              children: const [
                Icon(Icons.apartment_rounded, size: 36, color: Color(0xFF64748B)),
                SizedBox(width: 8),
                Icon(Icons.park_rounded, size: 32, color: Color(0xFF16A34A)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 3. Satellite GPS Badge (Screen 9)
class SatelliteGpsBadge extends StatelessWidget {
  const SatelliteGpsBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: AppColors.warningLight,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.warningBorder, width: 2),
      ),
      child: const Center(
        child: Icon(Icons.satellite_alt_rounded, size: 44, color: AppColors.warning),
      ),
    );
  }
}

/// 4. Stale Location Badge (Screen 10)
class StaleLocationBadge extends StatelessWidget {
  const StaleLocationBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.primaryBlue.withOpacity(0.3), width: 2),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: const [
          Icon(Icons.location_on_rounded, size: 44, color: AppColors.primaryBlue),
          Positioned(
            right: 14,
            bottom: 14,
            child: Icon(Icons.access_time_filled_rounded, size: 20, color: AppColors.warning),
          ),
        ],
      ),
    );
  }
}

/// 5. Poor Network Badge (Screen 11)
class PoorNetworkBadge extends StatelessWidget {
  const PoorNetworkBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: AppColors.errorLight,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.errorBorder, width: 2),
      ),
      child: const Center(
        child: Icon(Icons.signal_cellular_connected_no_internet_4_bar_rounded, size: 44, color: AppColors.error),
      ),
    );
  }
}

/// 6. Reconnecting Spinner Graphic (Screen 12)
class ReconnectingSpinnerGraphic extends StatelessWidget {
  const ReconnectingSpinnerGraphic({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 90,
      height: 90,
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.primaryBlueLight, width: 2),
      ),
      child: const Center(
        child: Icon(Icons.sync_rounded, size: 48, color: AppColors.primaryBlue),
      ),
    );
  }
}

