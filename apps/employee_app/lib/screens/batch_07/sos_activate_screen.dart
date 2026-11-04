import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../widgets/batch_07_illustrations.dart';
import '../../routes/app_routes.dart';

/// Screen 2: SOS - Activate
class SosActivateScreen extends StatefulWidget {
  const SosActivateScreen({super.key});

  @override
  State<SosActivateScreen> createState() => _SosActivateScreenState();
}

class _SosActivateScreenState extends State<SosActivateScreen> {
  double _sliderValue = 0.0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF7F1D1D), // Dark crimson emergency canvas
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, color: Colors.white, size: 24),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'SOS',
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            children: [
              const Spacer(),

              // Press & Hold Siren Centerpiece (Tap or hold to trigger)
              GestureDetector(
                onTap: () => context.push(AppRoutes.sosAlertConfirmed),
                child: const SosSirenBadge(),
              ),

              const SizedBox(height: 32),
              Text(
                'Press and hold for 3 seconds\nto send an emergency alert.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Colors.white.withOpacity(0.9),
                  height: 1.4,
                ),
              ),

              const Spacer(),

              // Slide to Send SOS Slider
              Container(
                width: double.infinity,
                height: 56,
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.25),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: Colors.white.withOpacity(0.3)),
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Text(
                      'Slide to Send SOS',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Colors.white.withOpacity(0.85),
                      ),
                    ),
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 22),
                        thumbColor: const Color(0xFFDC2626),
                        activeTrackColor: Colors.transparent,
                        inactiveTrackColor: Colors.transparent,
                        overlayColor: Colors.transparent,
                      ),
                      child: Slider(
                        value: _sliderValue,
                        onChanged: (val) {
                          setState(() => _sliderValue = val);
                          if (val >= 0.9) {
                            context.push(AppRoutes.sosAlertConfirmed);
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(
                  'Cancel',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white70,
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}
