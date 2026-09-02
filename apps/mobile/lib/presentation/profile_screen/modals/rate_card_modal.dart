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
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor, size: 20),
              const SizedBox(width: 10),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
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

class RateCardModal extends StatelessWidget {
  const RateCardModal({super.key});

  @override
  Widget build(BuildContext context) {
    return _ModalShell(
      title: 'Driver Rate Card',
      icon: Icons.speed_rounded,
      iconColor: const Color(0xFF0ea5e9),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _slabTable(
            title: '🚗 Sedan Slab Rates',
            rows: const [
              ['0–15 km', '₹350'],
              ['16–25 km', '₹500'],
              ['26–40 km', '₹750'],
              ['41–60 km', '₹1,050'],
            ],
          ),
          const SizedBox(height: 20),
          _slabTable(
            title: '🚙 SUV Slab Rates',
            rows: const [
              ['0–15 km', '₹500'],
              ['16–25 km', '₹700'],
              ['26–40 km', '₹1,000'],
              ['41–60 km', '₹1,400'],
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFf59e0b).withAlpha(20),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFf59e0b).withAlpha(77)),
            ),
            child: const Row(
              children: [
                Icon(
                  Icons.security_rounded,
                  color: Color(0xFFf59e0b),
                  size: 16,
                ),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Security Escort Addon: +₹150 per trip',
                    style: TextStyle(
                      color: Color(0xFFf59e0b),
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _slabTable({required String title, required List<List<String>> rows}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0f172a),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF334155)),
          ),
          child: Column(
            children: rows.asMap().entries.map((entry) {
              final i = entry.key;
              final row = entry.value;
              return Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          row[0],
                          style: const TextStyle(
                            color: Color(0xFF94a3b8),
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          row[1],
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            fontFeatures: [FontFeature.tabularFigures()],
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (i < rows.length - 1)
                    const Divider(color: Color(0xFF334155), height: 1),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}
