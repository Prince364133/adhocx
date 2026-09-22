import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:vibration/vibration.dart';
import 'dispatch_sound_player_stub.dart'
    if (dart.library.js_interop) 'dispatch_sound_player_web.dart' as web_audio;

/// Cross-platform audio alert and sound player for urgent dispatch offers.
/// Supports native hardware vibration patterns, carrier-grade audio chimes,
/// and synthesized web audio chimes.
class DispatchSoundPlayer {
  DispatchSoundPlayer._();

  static AudioPlayer? _audioPlayer;

  /// Play the incoming trip dispatch alert sound and continuous attention vibration
  static Future<void> playIncomingOfferAlert() async {
    // 1. Hardware vibration pattern on Mobile
    if (!kIsWeb) {
      try {
        final hasVibrator = await Vibration.hasVibrator();
        if (hasVibrator == true) {
          // Strong 3-burst alert vibration pattern: pause 0ms, buzz 500ms, pause 200ms, buzz 500ms, pause 200ms, buzz 500ms
          await Vibration.vibrate(
            pattern: [0, 500, 200, 500, 200, 500],
            intensities: [0, 255, 0, 255, 0, 255],
          );
        } else {
          HapticFeedback.heavyImpact();
        }
      } catch (e) {
        debugPrint('⚠️ [VIBRATION NOTICE] $e');
        try {
          HapticFeedback.heavyImpact();
        } catch (_) {}
      }
    }

    // 2. Audio Chime Playback
    if (!kIsWeb) {
      try {
        _audioPlayer ??= AudioPlayer();
        await _audioPlayer?.stop();
        await _audioPlayer?.setVolume(1.0);
        await _audioPlayer?.play(AssetSource('sounds/dispatch_alert.wav'));
      } catch (e) {
        debugPrint('⚠️ [AUDIO PLAYER NOTICE] $e');
        try {
          SystemSound.play(SystemSoundType.alert);
        } catch (_) {}
      }
    }

    // 3. Synthesize crisp carrier-grade attention chime on Web
    if (kIsWeb) {
      try {
        web_audio.playWebAudioChime();
      } catch (_) {}
    }
  }

  /// Stop vibration and audio when driver responds (accepts / declines) or dialog closes
  static Future<void> stopAlert() async {
    if (!kIsWeb) {
      try {
        await Vibration.cancel();
      } catch (_) {}
      try {
        await _audioPlayer?.stop();
      } catch (_) {}
    }
  }
}
