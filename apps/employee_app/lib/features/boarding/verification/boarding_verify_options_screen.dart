import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Boarding - Verify Options backed by live nextTrip + tracking APIs.
class BoardingVerifyOptionsScreen extends StatelessWidget {
  const BoardingVerifyOptionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final driver = (tracking['driver'] ?? next['driver']) as Map?;
        final vehicle = (tracking['vehicle'] ?? next['vehicle']) as Map?;

        final tripType = EmployeeDataProvider.formatDirectionLabel(
          next['direction']?.toString(),
        );
        final driverName = driver?['fullName']?.toString() ??
            driver?['name']?.toString() ??
            'Not yet assigned';
        final plate = vehicle?['registrationNumber']?.toString() ??
            vehicle?['plateNumber']?.toString();
        final driverLine = plate != null && plate.isNotEmpty
            ? 'Driver: $driverName • $plate'
            : 'Driver: $driverName';

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustrationGap: AppSpacing.xxl,
          illustration: Container(
            width: double.infinity,
            height: 180,
            decoration: BoxDecoration(
              color: p.accentTint,
              borderRadius: AppRadius.borderXxl,
              border: Border.all(color: p.border),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.directions_car_filled_rounded,
                    size: 68, color: p.accent),
                const SizedBox(height: AppSpacing.sm + 2),
                const Icon(Icons.qr_code_scanner_rounded,
                    size: 32, color: AppColors.brandOrange),
              ],
            ),
          ),
          title: 'Board Your Cab',
          message:
              'Verify your boarding with the boarding OTP or dynamic QR code.',
          content: BoardingTripPreviewCard(
            tripType: tripType,
            driverLine: driverLine,
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'Enter OTP',
              icon: Icons.pin_rounded,
              onPressed: () => context.push(AppRoutes.boardingOtpInput),
            ),
            EmployeeSecondaryButton(
              label: 'Scan QR Code',
              icon: Icons.qr_code_scanner_rounded,
              textColor: p.accent,
              borderColor: p.accent,
              onPressed: () => context.push(AppRoutes.scanBoardingQr),
            ),
          ],
        );
      },
    );
  }
}
