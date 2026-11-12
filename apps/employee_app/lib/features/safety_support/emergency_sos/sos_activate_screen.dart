import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/widgets/batch_07_illustrations.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

/// Screen 2: SOS - Activate
class SosActivateScreen extends StatefulWidget {
  const SosActivateScreen({super.key});

  @override
  State<SosActivateScreen> createState() => _SosActivateScreenState();
}

class _SosActivateScreenState extends State<SosActivateScreen> {
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

              // Tap the siren to trigger the emergency alert.
              GestureDetector(
                onTap: () => context.push(AppRoutes.sosAlertConfirmed),
                child: const SosSirenBadge(),
              ),

              const SizedBox(height: 32),
              Text(
                'Tap the SOS siren to send an emergency alert.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Colors.white.withValues(alpha: 0.9),
                  height: 1.4,
                ),
              ),

              const Spacer(),

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
