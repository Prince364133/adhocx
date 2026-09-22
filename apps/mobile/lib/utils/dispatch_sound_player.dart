import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'dispatch_sound_player_stub.dart'
    if (dart.library.js_interop) 'dispatch_sound_player_web.dart' as web_audio;

/// Cross-platform audio alert and sound player for urgent dispatch offers.
/// Supports native haptics, system sounds, and synthesized web audio chimes.
class DispatchSoundPlayer {
  DispatchSoundPlayer._();

  /// Play the incoming trip dispatch alert sound and haptic pulse
  static void playIncomingOfferAlert() {
    // 1. Haptic alert
    try {
      HapticFeedback.heavyImpact();
      Future.delayed(const Duration(milliseconds: 200), () {
        HapticFeedback.vibrate();
      });
    } catch (_) {}

    // 2. System audio on mobile
    try {
      SystemSound.play(SystemSoundType.alert);
    } catch (_) {}

    // 3. Synthesize crisp carrier-grade attention chime on Web
    if (kIsWeb) {
      try {
        web_audio.playWebAudioChime();
      } catch (_) {}
    }
  }
}
