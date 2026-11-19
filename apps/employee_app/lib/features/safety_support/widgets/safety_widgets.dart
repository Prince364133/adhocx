import 'package:url_launcher/url_launcher.dart';

/// Standard national & 24/7 corporate safety helplines.
const List<Map<String, String>> kDefaultEmergencyContacts = [
  {
    'name': '24/7 Transport Safety Desk',
    'phone': '1800-419-7000',
    'type': 'company',
  },
  {
    'name': 'National Emergency Response',
    'phone': '112',
    'type': 'security',
  },
  {
    'name': 'Police Control Room',
    'phone': '100',
    'type': 'police',
  },
  {
    'name': 'Medical / Ambulance',
    'phone': '108',
    'type': 'medical',
  },
  {
    'name': 'Fire & Rescue',
    'phone': '101',
    'type': 'fire',
  },
  {
    'name': 'Women Safety Helpline',
    'phone': '181',
    'type': 'security',
  },
];

/// Opens the phone dialer for [phone] (spaces and dashes are stripped).
Future<void> dialNumber(String phone) async {
  final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
  if (clean.isEmpty) return;
  final uri = Uri.parse('tel:$clean');
  if (await canLaunchUrl(uri)) await launchUrl(uri);
}
