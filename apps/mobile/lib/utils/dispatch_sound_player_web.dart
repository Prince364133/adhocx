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

/// Synthesizes a pleasant 4-tone ascending musical chime (C5 - E5 - G5 - C6) for in-app messaging & notifications
void playWebMusicalNotificationChime() {
  try {
    final ctx = web.AudioContext();
    if (ctx.state == 'suspended') {
      ctx.resume();
    }
    final now = ctx.currentTime;
    final notes = [
      {'freq': 523.25, 'delay': 0.0, 'duration': 0.35, 'vol': 0.25}, // C5
      {'freq': 659.25, 'delay': 0.09, 'duration': 0.35, 'vol': 0.25}, // E5
      {'freq': 783.99, 'delay': 0.18, 'duration': 0.40, 'vol': 0.28}, // G5
      {'freq': 1046.50, 'delay': 0.27, 'duration': 0.60, 'vol': 0.32}, // C6
    ];

    for (final note in notes) {
      final osc = ctx.createOscillator();
      final gain = ctx.createGain();
      final startTime = now + (note['delay'] as double);
      final duration = note['duration'] as double;
      final vol = note['vol'] as double;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note['freq'] as double, startTime);
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    }
  } catch (e) {
    debugPrint('Web musical chime notice: $e');
  }
}

/// Speaks out a voice announcement using Web Speech Synthesis API
void speakWebVoiceAnnouncement(String message) {
  try {
    final synth = web.window.speechSynthesis;
    final utter = web.SpeechSynthesisUtterance(message);
    utter.rate = 1.05;
    utter.pitch = 1.0;
    synth.speak(utter);
  } catch (e) {
    debugPrint('Web voice announcement notice: $e');
  }
}
