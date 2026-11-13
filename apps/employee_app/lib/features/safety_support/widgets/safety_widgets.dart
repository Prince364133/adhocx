import 'package:url_launcher/url_launcher.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';

/// Loads one section of the mock safety data.
Future<Map<String, dynamic>?> loadSafetySection(String key) async =>
    (await MockDataService.getSafetyData())[key] as Map<String, dynamic>?;

/// Loads a list section of the mock safety data, wrapped as `{'items': …}`.
Future<Map<String, dynamic>> loadSafetyList(String key) async =>
    {'items': (await MockDataService.getSafetyData())[key]};

/// Opens the phone dialer for [phone] (spaces and dashes are stripped).
Future<void> dialNumber(String phone) async {
  final uri = Uri.parse('tel:${phone.replaceAll(RegExp(r'[^0-9+]'), '')}');
  if (await canLaunchUrl(uri)) await launchUrl(uri);
}
