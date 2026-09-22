import 'package:flutter/foundation.dart';
import 'package:web/web.dart' as web;

/// Synthesizes a carrier-grade two-tone chime via Web Audio API
void playWebAudioChime() {
  try {
    final ctx = web.AudioContext();
    if (ctx.state == 'suspended') {
      ctx.resume();
    }
    final now = ctx.currentTime;

    // Note 1: High crisp bell (C6 - 1046.5 Hz)
    final osc1 = ctx.createOscillator();
    final gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Note 2: Harmonizing third (E6 - 1318.5 Hz) 120ms later
    final osc2 = ctx.createOscillator();
    final gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.5, now + 0.12);
    gain2.gain.setValueAtTime(0.28, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.8);
  } catch (e) {
    debugPrint('Web audio synthesis notice: $e');
  }
}
