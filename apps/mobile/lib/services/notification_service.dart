import 'dart:async';
import 'package:flutter/foundation.dart';
import '../core/networking/api_client.dart';
import '../core/utils/app_logger.dart';

class InAppNotification {
  final String id;
  final String title;
  final String body;
  final String? type;
  final Map<String, dynamic>? data;
  final bool isRead;
  final DateTime createdAt;

  InAppNotification({
    required this.id,
    required this.title,
    required this.body,
    this.type,
    this.data,
    required this.isRead,
    required this.createdAt,
  });

  factory InAppNotification.fromJson(Map<String, dynamic> json) {
    return InAppNotification(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Notification',
      body: json['body']?.toString() ?? '',
      type: json['type']?.toString(),
      data: json['data'] is Map ? Map<String, dynamic>.from(json['data'] as Map) : null,
      isRead: json['isRead'] == true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

/// Centralized In-App Notification Service for fetching notifications feed,
/// maintaining real-time unread counter, and synchronizing read state with the backend.
class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final ValueNotifier<int> unreadCount = ValueNotifier<int>(0);

  /// Fetch paginated in-app notifications for the authenticated user and sync unreadCount
  Future<Map<String, dynamic>> getInAppNotifications({int page = 1, int limit = 30}) async {
    try {
      final res = await ApiClient.instance.get(
        '/notifications/in-app',
        queryParameters: {'page': page, 'limit': limit},
        force: true,
      );

      if (res is Map) {
        final rawCount = res['unreadCount'];
        if (rawCount is num) {
          unreadCount.value = rawCount.toInt();
        }
        final rawList = res['notifications'] as List? ?? [];
        final items = rawList
            .map((e) => InAppNotification.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
        return {
          'notifications': items,
          'unreadCount': unreadCount.value,
          'total': (res['total'] as num?)?.toInt() ?? items.length,
        };
      }
    } catch (e) {
      AppLogger.warn('Failed to load in-app notifications: $e', tag: 'NOTIFS');
    }
    return {
      'notifications': <InAppNotification>[],
      'unreadCount': unreadCount.value,
      'total': 0,
    };
  }

  /// Lightweight check to refresh the badge counter
  Future<void> refreshUnreadCount() async {
    try {
      final res = await ApiClient.instance.get(
        '/notifications/in-app',
        queryParameters: {'limit': 1},
        force: true,
      );
      if (res is Map && res['unreadCount'] is num) {
        unreadCount.value = (res['unreadCount'] as num).toInt();
      }
    } catch (_) {}
  }

  /// Mark single notification as read
  Future<void> markAsRead(String id) async {
    try {
      await ApiClient.instance.patch('/notifications/in-app/$id/read');
      if (unreadCount.value > 0) {
        unreadCount.value = unreadCount.value - 1;
      }
    } catch (e) {
      AppLogger.warn('Failed to mark notification $id as read: $e', tag: 'NOTIFS');
    }
  }

  /// Mark all notifications as read for current user
  Future<void> markAllAsRead() async {
    try {
      await ApiClient.instance.patch('/notifications/in-app/read-all');
      unreadCount.value = 0;
    } catch (e) {
      AppLogger.warn('Failed to mark all notifications as read: $e', tag: 'NOTIFS');
    }
  }
}
