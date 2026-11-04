import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class CorporateRealtimeEvent {
  const CorporateRealtimeEvent(this.event, this.payload);
  final String event;
  final Map<String, dynamic> payload;

  String? get routeId => payload['routeId']?.toString();
  String? get stopId => payload['stopId']?.toString();
}

/// Parses one SSE frame. The API's `GET /notifications/events` stream sends no `event:` line;
/// every `data:` line carries `{channel, event, payload, timestamp}`. A frame with an explicit
/// `event:` line and a bare payload is accepted too.
CorporateRealtimeEvent? parseCorporateSseFrame(String frame) {
  String? eventLine;
  final data = StringBuffer();
  for (final line in frame.split('\n')) {
    if (line.startsWith('event:')) {
      eventLine = line.substring(6).trim();
    } else if (line.startsWith('data:')) {
      if (data.isNotEmpty) data.write('\n');
      data.write(line.substring(5).trim());
    }
  }
  if (data.isEmpty) return null;
  try {
    final decoded = jsonDecode(data.toString());
    if (decoded is! Map) return null;
    final map = decoded.map((k, v) => MapEntry(k.toString(), v));
    if (map['event'] is String && map['payload'] is Map) {
      final payload = (map['payload'] as Map).map((k, v) => MapEntry(k.toString(), v));
      return CorporateRealtimeEvent(map['event'] as String, payload);
    }
    if (eventLine != null && eventLine.isNotEmpty && eventLine != 'message') {
      return CorporateRealtimeEvent(eventLine, map);
    }
  } catch (_) {}
  return null;
}

/// Server-Sent Events subscription to the corporate `driver:<driverId>` channel, with
/// reconnect back-off. [onConnected] fires on every (re)connect so the caller can re-sync
/// state the stream may have missed (pending offer restore).
class CorporateRealtimeClient {
  CorporateRealtimeClient({required this.onEvent, this.onConnected});

  final void Function(CorporateRealtimeEvent event) onEvent;
  final VoidCallback? onConnected;

  http.Client? _client;
  StreamSubscription<String>? _sub;
  Timer? _retry;
  bool _active = false;
  int _attempts = 0;
  String? _baseUrl;
  String? _token;
  String? _channel;

  bool get isActive => _active;
  String? get channel => _channel;

  void connect({required String baseUrl, required String token, required String channel}) {
    if (_active && _channel == channel && _token == token) return;
    disconnect();
    _baseUrl = baseUrl;
    _token = token;
    _channel = channel;
    _active = true;
    _attempts = 0;
    _open();
  }

  Future<void> _open() async {
    if (!_active) return;
    _retry?.cancel();
    await _sub?.cancel();
    _client?.close();
    final uri = Uri.parse('$_baseUrl/notifications/events').replace(queryParameters: {'channel': _channel});
    try {
      _client = http.Client();
      final req = http.Request('GET', uri)
        ..headers['Authorization'] = 'Bearer $_token'
        ..headers['Accept'] = 'text/event-stream'
        ..headers['Cache-Control'] = 'no-cache';
      final res = await _client!.send(req);
      if (!_active) return;
      if (res.statusCode != 200) {
        _scheduleRetry();
        return;
      }
      _attempts = 0;
      onConnected?.call();
      var buffer = '';
      _sub = res.stream.transform(utf8.decoder).listen(
        (chunk) {
          buffer += chunk.replaceAll('\r\n', '\n');
          while (buffer.contains('\n\n')) {
            final i = buffer.indexOf('\n\n');
            final frame = buffer.substring(0, i);
            buffer = buffer.substring(i + 2);
            final evt = parseCorporateSseFrame(frame);
            if (evt != null) onEvent(evt);
          }
        },
        onError: (_) => _scheduleRetry(),
        onDone: _scheduleRetry,
        cancelOnError: true,
      );
    } catch (e) {
      debugPrint('[CorporateRealtime] connect failed: $e');
      _scheduleRetry();
    }
  }

  void _scheduleRetry() {
    if (!_active) return;
    _attempts++;
    final seconds = (3 * _attempts).clamp(3, 30);
    _retry?.cancel();
    _retry = Timer(Duration(seconds: seconds), _open);
  }

  void disconnect() {
    _active = false;
    _retry?.cancel();
    _retry = null;
    _sub?.cancel();
    _sub = null;
    _client?.close();
    _client = null;
  }
}
