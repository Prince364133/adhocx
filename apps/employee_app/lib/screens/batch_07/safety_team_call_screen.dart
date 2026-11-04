import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../widgets/batch_07_illustrations.dart';

/// Screen 4: Safety Team Call (In Progress)
class SafetyTeamCallScreen extends StatefulWidget {
  const SafetyTeamCallScreen({super.key});

  @override
  State<SafetyTeamCallScreen> createState() => _SafetyTeamCallScreenState();
}

class _SafetyTeamCallScreenState extends State<SafetyTeamCallScreen> {
  bool _isCallAnswered = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Dark call screen canvas
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 30),
          child: Column(
            children: [
              const SizedBox(height: 30),
              Text(
                'Safety Team',
                style: GoogleFonts.inter(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _isCallAnswered ? 'Connected • 00:14' : 'Incoming Emergency Call...',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: _isCallAnswered ? const Color(0xFF4ADE80) : Colors.white70,
                ),
              ),

              const Spacer(),

              // Center Call Pulse Graphic
              const SafetyCallPulseAvatar(),

              const Spacer(),

              // Call Controls
              if (!_isCallAnswered) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // Accept Call (Green)
                    InkWell(
                      onTap: () {
                        setState(() => _isCallAnswered = true);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: const BoxDecoration(
                          color: Color(0xFF16A34A),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.call_rounded, size: 32, color: Colors.white),
                      ),
                    ),
                    // Decline Call (Red)
                    InkWell(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: const BoxDecoration(
                          color: Color(0xFFDC2626),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.call_end_rounded, size: 32, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ] else ...[
                // Connected Call Actions (Mute, Speaker, End Call)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.mic_off_rounded, color: Colors.white, size: 28),
                      onPressed: () {},
                    ),
                    InkWell(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: const BoxDecoration(
                          color: Color(0xFFDC2626),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.call_end_rounded, size: 32, color: Colors.white),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.volume_up_rounded, color: Colors.white, size: 28),
                      onPressed: () {},
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
