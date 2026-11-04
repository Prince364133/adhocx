import 'package:url_launcher/url_launcher.dart';

/// Opens Google Maps turn-by-turn navigation to a stop, following the pattern used by the
/// marketplace trip details screen: Android navigation intent first, then the universal
/// directions URL.
Future<bool> launchCorporateNavigation(double lat, double lng) async {
  final navUri = Uri.parse('google.navigation:q=$lat,$lng&mode=d');
  final webDirUri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving');
  try {
    if (await canLaunchUrl(navUri)) {
      return await launchUrl(navUri, mode: LaunchMode.externalApplication);
    }
    return await launchUrl(webDirUri, mode: LaunchMode.externalApplication);
  } catch (_) {
    try {
      return await launchUrl(webDirUri);
    } catch (_) {
      return false;
    }
  }
}
