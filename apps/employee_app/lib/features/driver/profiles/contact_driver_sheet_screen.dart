import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';

/// Contact Driver Sheet backed by live nextTrip / tracking driver info.
class ContactDriverSheetScreen extends StatefulWidget {
  const ContactDriverSheetScreen({super.key});

  @override
  State<ContactDriverSheetScreen> createState() =>
      _ContactDriverSheetScreenState();
}

class _ContactDriverSheetScreenState extends State<ContactDriverSheetScreen> {
  Map<String, dynamic>? _driver;
  Map<String, dynamic>? _vehicle;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final snapshot = await loadLiveTripSnapshot(context);
    final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
    final tracking =
        (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
    final drv = tracking['driver'] ?? next['driver'];
    final veh = tracking['vehicle'] ?? next['vehicle'];
    if (mounted) {
      setState(() {
        _driver = drv is Map ? Map<String, dynamic>.from(drv) : null;
        _vehicle = veh is Map ? Map<String, dynamic>.from(veh) : null;
        _isLoading = false;
      });
    }
  }

  Future<void> _launchCall(String phone) async {
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (cleanPhone.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Driver phone number is not available yet.')),
      );
      return;
    }
    final uri = Uri.parse('tel:$cleanPhone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = _driver?['fullName']?.toString() ??
        _driver?['name']?.toString() ??
        'Not yet assigned';
    final rating = (_driver?['rating'] is num)
        ? (_driver!['rating'] as num).toDouble()
        : 5.0;
    final vehicleNumber = _vehicle?['registrationNumber']?.toString() ??
        _vehicle?['plateNumber']?.toString() ??
        'Pending assignment';
    final phone = _driver?['phoneNumber']?.toString() ??
        _driver?['phone']?.toString() ??
        '';

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => Navigator.of(context).pop(),
              child: const ColoredBox(color: Colors.transparent),
            ),
          ),
          Positioned.fill(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: DraggableScrollableSheet(
                expand: false,
                initialChildSize: 0.72,
                minChildSize: 0.42,
                maxChildSize: 0.94,
                builder: (context, scrollController) => SizedBox.expand(
                  child: AppBottomSheet(
                    title: 'Contact Driver',
                    scrollController: scrollController,
                    child: _isLoading
                        ? const SkeletonCard(
                            height: 180,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    SkeletonAvatar(size: 56),
                                    SizedBox(width: AppSpacing.md),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          SkeletonText(height: 14),
                                          SizedBox(height: AppSpacing.sm),
                                          SkeletonText(width: 120, height: 10),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                SizedBox(height: AppSpacing.xl),
                                SkeletonButton(),
                              ],
                            ),
                          )
                        : EmployeeDriverContactSheet(
                            driverName: name,
                            rating: rating,
                            vehicleNumber: vehicleNumber,
                            phone: phone.isNotEmpty ? phone : 'Unavailable',
                            onCall: () => _launchCall(phone),
                            onChat: () {
                              Navigator.of(context).pop();
                              context.push(AppRoutes.safetyLiveChat);
                            },
                          ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
