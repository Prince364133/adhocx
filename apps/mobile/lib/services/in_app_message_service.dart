import 'dart:convert';
import 'package:flutter/material.dart';
import '../utils/dispatch_sound_player.dart';
import './local_notification_service.dart';

/// In-App Messaging Service for AdhocX.
/// Dispatches audio alerts and delegates to high-priority native notifications,
/// avoiding duplicate in-app overlay banners.
class InAppMessageService {
  InAppMessageService._();
  static final InAppMessageService instance = InAppMessageService._();

  /// Play audio/voice prompt and show native notification
  void showInAppNotification({
    required String title,
    required String body,
    Map<String, dynamic>? data,
    VoidCallback? onTap,
    bool playSound = true,
  }) {
    // 1. Play musical chime and spoken voice announcement
    if (playSound) {
      DispatchSoundPlayer.playNotificationChime(title: title, body: body);
    }

    // 2. Delegate to native system notification (custom overlay banner disabled)
    LocalNotificationService.instance.showIncomingRideNotification(
      title: title,
      body: body,
      payload: data != null ? jsonEncode(data) : null,
    );
  }

  /// Dismiss active notification if any
  void dismissActiveNotification() {
    // No-op: native notification auto-cancels or is dismissed by user
  }

  /// Convenient test trigger to preview notification sound
  void triggerTestNotification() {
    showInAppNotification(
      title: 'Corporate Fleet Dispatch Notice',
      body: 'Your automated dispatch system is synchronized and ready for trip requests.',
      data: {'type': 'SYSTEM_TEST'},
    );
  }
}
