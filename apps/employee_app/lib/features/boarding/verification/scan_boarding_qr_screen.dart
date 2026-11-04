import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/batch_06_illustrations.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

/// Screen 3: Scan QR for Boarding
class ScanBoardingQrScreen extends StatefulWidget {
  const ScanBoardingQrScreen({super.key});

  @override
  State<ScanBoardingQrScreen> createState() => _ScanBoardingQrScreenState();
}

class _ScanBoardingQrScreenState extends State<ScanBoardingQrScreen> {
  bool _isFlashOn = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Scan Boarding QR',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(),

            // Reticle framing container (Clickable to simulate scan)
            GestureDetector(
              onTap: () => context.push(AppRoutes.verifyingBoarding),
              child: Column(
                children: [
                  const BoardingQrFrame(),
                  const SizedBox(height: 20),
                  Text(
                    'Point camera at the QR code on the cab dashboard',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ),

            const Spacer(),

            // Flashlight Toggle Button
            InkWell(
              onTap: () {
                setState(() => _isFlashOn = !_isFlashOn);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(_isFlashOn ? 'Camera flash turned ON' : 'Camera flash turned OFF')),
                );
              },
              borderRadius: BorderRadius.circular(30),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: Colors.white.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _isFlashOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _isFlashOn ? 'Turn Off Flash' : 'Turn On Flash',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 36),
          ],
        ),
      ),
    );
  }
}



