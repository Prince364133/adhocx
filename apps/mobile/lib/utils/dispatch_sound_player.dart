import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'dart:js_interop' as js;

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
      _playWebAudioChime();
    }
  }

  /// Synthesizes a pleasant, carrier-grade two-tone chime via Web Audio API
  static void _playWebAudioChime() {
    try {
      // Execute via JS context
      _evalWebAudio('''
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            if (ctx.state === 'suspended') {
              ctx.resume();
            }
            const now = ctx.currentTime;
            
            // Note 1: High crisp bell (C6 - 1046.5 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(1046.5, now);
            gain1.gain.setValueAtTime(0.35, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.6);

            // Note 2: Harmonizing third (E6 - 1318.5 Hz) 120ms later
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(1318.5, now + 0.12);
            gain2.gain.setValueAtTime(0.28, now + 0.12);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.12);
            osc2.stop(now + 0.8);
          }
        } catch (e) {
          console.log('Audio chime notice:', e);
        }
      ''');
    } catch (e) {
      debugPrint('Web audio synthesis notice: $e');
    }
  }

  static void _evalWebAudio(String script) {
    try {
      // In flutter web, run web audio script
      final globalThis = js.globalContext;
      // invoke eval if available
      (globalThis as dynamic).eval?.call(script);
    } catch (_) {}
  }
}
