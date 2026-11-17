import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';

/// Screen: Contact Driver Sheet
/// Uses the Driver app's AppBottomSheet + EmployeeDriverContactSheet.
class ContactDriverSheetScreen extends StatefulWidget {
  const ContactDriverSheetScreen({super.key});

  @override
  State<ContactDriverSheetScreen> createState() =>
      _ContactDriverSheetScreenState();
}

class _ContactDriverSheetScreenState extends State<ContactDriverSheetScreen> {
  Map<String, dynamic>? _driver;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final assignment = await MockDataService.getDriverAssignment();
    if (mounted) {
      setState(() {
        _driver = assignment['driver'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  Future<void> _launchCall(String phone) async {
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    final uri = Uri.parse('tel:$cleanPhone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = _driver?['name'] ?? 'Suresh R';
    final rating = (_driver?['rating'] ?? 4.8).toDouble();
    final vehicleNumber = _driver?['vehicleNumber'] ?? 'TS09UB7845';
    final phone = _driver?['phone'] ?? '+91 98765 00111';

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
                        ? const SizedBox(
                            height: 180,
                            child: Center(
                              child: CircularProgressIndicator(
                                color: AppColors.primary,
                              ),
                            ),
                          )
                        : EmployeeDriverContactSheet(
                            driverName: name,
                            rating: rating,
                            vehicleNumber: vehicleNumber,
                            phone: phone,
                            onCall: () => _launchCall(phone),
                            onChat: () {
                              Navigator.of(context).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                      'In-app chat connected with driver.'),
                                  duration: Duration(seconds: 2),
                                ),
                              );
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
