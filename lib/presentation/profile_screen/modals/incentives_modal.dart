import 'package:flutter/material.dart';

class _ModalShell extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final Widget child;

  const _ModalShell({
    required this.title,
    required this.icon,
    required this.iconColor,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1e293b),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor, size: 24),
              const SizedBox(width: 10),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class IncentivesModal extends StatelessWidget {
  const IncentivesModal({super.key});

  @override
  Widget build(BuildContext context) {
    return _ModalShell(
      title: 'Daily Target Incentives',
      icon: Icons.emoji_events_rounded,
      iconColor: const Color(0xFFf59e0b),
      child: Column(
        children: [
          _IncentiveTile(
            trips: 5,
            bonus: '₹200',
            color: const Color(0xFF10b981),
            icon: Icons.directions_car_rounded,
          ),
          const SizedBox(height: 12),
          _IncentiveTile(
            trips: 8,
            bonus: '₹450',
            color: const Color(0xFF0ea5e9),
            icon: Icons.local_fire_department_rounded,
          ),
          const SizedBox(height: 12),
          _IncentiveTile(
            trips: 12,
            bonus: '₹800',
            color: const Color(0xFFf59e0b),
            icon: Icons.emoji_events_rounded,
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0f172a),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: const Text(
              'Incentives are credited automatically to your wallet at the end of each day after completing the required number of trips.',
              style: TextStyle(color: Color(0xFF94a3b8), fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}

class _IncentiveTile extends StatelessWidget {
  final int trips;
  final String bonus;
  final Color color;
  final IconData icon;

  const _IncentiveTile({
    required this.trips,
    required this.bonus,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withAlpha(15),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withAlpha(64)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withAlpha(38),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$trips trips/day',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Text(
                  'Complete daily target',
                  style: TextStyle(color: Color(0xFF94a3b8), fontSize: 11),
                ),
              ],
            ),
          ),
          Text(
            '+$bonus',
            style: TextStyle(
              color: color,
              fontSize: 18,
              fontWeight: FontWeight.w700,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}
