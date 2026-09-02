import 'package:flutter/material.dart';

class ProfileDriverCardWidget extends StatelessWidget {
  final Map<String, dynamic> profile;
  final VoidCallback onTap;

  const ProfileDriverCardWidget({
    super.key,
    required this.profile,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // 1. SAFELY extract data with fallbacks so it never crashes or relies on old cache
    final name = profile['name']?.toString() ?? 'Unknown Driver';
    final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : 'D';
    
    final vehicleNum = profile['vehicle_number']?.toString() ?? 'N/A';
    final vehicleType = profile['vehicle_type']?.toString() ?? 'N/A';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF0d1117),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF1a2332)),
        ),
        child: Row(
          children: [
            // Avatar — driver initial with green accent
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: const Color(0xFF22c55e).withAlpha(31),
                shape: BoxShape.circle,
                border: Border.all(
                  color: const Color(0xFF22c55e).withAlpha(102),
                  width: 2,
                ),
              ),
              child: Center(
                child: Text(
                  initial,
                  style: const TextStyle(
                    color: Color(0xFF22c55e),
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF22c55e).withAlpha(31),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: const Color(0xFF22c55e).withAlpha(77),
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.verified_rounded,
                              color: Color(0xFF22c55e),
                              size: 10,
                            ),
                            SizedBox(width: 3),
                            Text(
                              'Verified',
                              style: TextStyle(
                                color: Color(0xFF22c55e),
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$vehicleNum · $vehicleType',
                    style: const TextStyle(
                      color: Color(0xFF94a3b8),
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(
                        Icons.edit_rounded,
                        color: Color(0xFF22c55e),
                        size: 12,
                      ),
                      const SizedBox(width: 4),
                      const Text(
                        'Tap to update KYC, RC & Bank details',
                        style: TextStyle(
                          color: Color(0xFF22c55e),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: Color(0xFF475569),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}