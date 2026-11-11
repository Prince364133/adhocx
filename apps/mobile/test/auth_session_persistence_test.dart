import 'dart:async';
import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'package:adhocx/core/networking/api_client.dart';
import 'package:adhocx/services/auth_service.dart';

class _StubHttpClient extends http.BaseClient {
  final Future<http.Response> Function(http.BaseRequest request) handler;

  _StubHttpClient(this.handler);

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final res = await handler(request);
    final bytes = utf8.encode(res.body);
    return http.StreamedResponse(
      Stream<List<int>>.value(bytes),
      res.statusCode,
      headers: res.headers,
      request: request,
    );
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const secureStorageChannel = MethodChannel(
    'plugins.it_nomads.com/flutter_secure_storage',
  );

  void installSecureStorageMock({
    required bool shouldThrow,
    required bool returnNullOnRead,
    Map<String, String>? store,
  }) {
    final backingStore = store ?? <String, String>{};
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(secureStorageChannel, (call) async {
      if (shouldThrow) {
        throw PlatformException(code: 'KEYSTORE_ERR', message: 'KeyStore unavailable');
      }
      final args = call.arguments is Map ? call.arguments as Map : const {};
      final key = args['key']?.toString();
      switch (call.method) {
        case 'write':
          if (key != null && args['value'] != null) {
            backingStore[key] = args['value'].toString();
          }
          return null;
        case 'read':
          if (returnNullOnRead || key == null) return null;
          return backingStore[key];
        case 'delete':
          if (key != null) backingStore.remove(key);
          return null;
        case 'deleteAll':
          backingStore.clear();
          return null;
        default:
          return null;
      }
    });
  }

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    ApiClient.instance.resetMemoryTokensForTesting();
    AuthService.instance.resetForTesting();
    installSecureStorageMock(shouldThrow: false, returnNullOnRead: false);
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(secureStorageChannel, null);
  });

  group('ApiClient token persistence hardening', () {
    test('retains access and refresh tokens when FlutterSecureStorage throws', () async {
      installSecureStorageMock(shouldThrow: true, returnNullOnRead: true);

      await ApiClient.instance.setTokens(
        accessToken: 'acc-keystore-fail',
        refreshToken: 'ref-keystore-fail',
      );

      expect(await ApiClient.instance.getToken(), equals('acc-keystore-fail'));
      expect(await ApiClient.instance.getRefreshToken(), equals('ref-keystore-fail'));

      // Even after clearing in-memory cache (simulating cold start), fallback retains tokens
      ApiClient.instance.resetMemoryTokensForTesting();
      expect(await ApiClient.instance.getToken(), equals('acc-keystore-fail'));
      expect(await ApiClient.instance.getRefreshToken(), equals('ref-keystore-fail'));
    });

    test('removes SharedPreferences fallback when FlutterSecureStorage write & read-back succeed', () async {
      final secureMap = <String, String>{};
      installSecureStorageMock(
        shouldThrow: false,
        returnNullOnRead: false,
        store: secureMap,
      );

      await ApiClient.instance.setTokens(
        accessToken: 'acc-secure-ok',
        refreshToken: 'ref-secure-ok',
      );

      expect(secureMap['adhocx_auth_token'], equals('acc-secure-ok'));
      expect(secureMap['adhocx_refresh_token'], equals('ref-secure-ok'));

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('adhocx_auth_token'), isNull);
      expect(prefs.getString('adhocx_refresh_token'), isNull);
    });

    test('in-flight 401 /auth/refresh cannot wipe tokens from a newer login', () async {
      await ApiClient.instance.setTokens(
        accessToken: 'acc-old',
        refreshToken: 'ref-old',
      );

      final refreshGate = Completer<void>();
      final client = _StubHttpClient((request) async {
        if (request.url.path.endsWith('/auth/refresh')) {
          await refreshGate.future;
          return http.Response(jsonEncode({'message': 'Expired'}), 401);
        }
        return http.Response('{}', 200);
      });

      await http.runWithClient(() async {
        final refreshFuture = ApiClient.instance.attemptTokenRefresh();
        await Future<void>.delayed(const Duration(milliseconds: 20));

        await ApiClient.instance.setTokens(
          accessToken: 'acc-newer',
          refreshToken: 'ref-newer',
        );

        refreshGate.complete();
        expect(await refreshFuture, isFalse);

        expect(await ApiClient.instance.getToken(), equals('acc-newer'));
        expect(await ApiClient.instance.getRefreshToken(), equals('ref-newer'));
      }, () => client);
    });
  });

  group('AuthService session epoch guards', () {
    test('slow pre-login checkAuthSession failing with 401 cannot clear a newer login session', () async {
      final secureMap = <String, String>{
        'adhocx_auth_token': 'token-stale',
        'adhocx_refresh_token': 'refresh-stale',
      };
      installSecureStorageMock(
        shouldThrow: false,
        returnNullOnRead: false,
        store: secureMap,
      );

      final staleMeGate = Completer<void>();

      final client = _StubHttpClient((request) async {
        final path = request.url.path;
        final authHeader = request.headers['Authorization'] ?? request.headers['authorization'] ?? '';

        if (path.endsWith('/auth/login')) {
          return http.Response(
            jsonEncode({
              'accessToken': 'token-fresh',
              'refreshToken': 'refresh-fresh',
              'user': {
                'id': 'u-rejected-driver',
                'role': 'DRIVER',
                'phone': '+919000000010',
                'isOnboarded': true,
                'isApproved': false,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        if (path.endsWith('/auth/me')) {
          if (authHeader.contains('token-stale')) {
            await staleMeGate.future;
            return http.Response(
              jsonEncode({'message': 'Unauthorized'}),
              401,
              headers: {'content-type': 'application/json'},
            );
          }
          if (authHeader.contains('token-fresh')) {
            return http.Response(
              jsonEncode({
                'id': 'u-rejected-driver',
                'role': 'DRIVER',
                'phone': '+919000000010',
                'isOnboarded': true,
                'isApproved': false,
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(jsonEncode({'message': 'Unauthorized'}), 401);
        }

        if (path.endsWith('/auth/refresh')) {
          return http.Response(
            jsonEncode({'message': 'Expired refresh token'}),
            401,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response('{}', 200, headers: {'content-type': 'application/json'});
      });

      await http.runWithClient(() async {
        // 1. Start boot session check (like main.dart startup) while /auth/me hangs
        final bootCheckFuture = AuthService.instance.checkAuthSession();
        await Future<void>.delayed(const Duration(milliseconds: 20));

        // 2. User completes login while boot check is still in flight
        final loginResult = await AuthService.instance.loginWithPassword(
          identifier: '+919000000010',
          password: 'password123',
        );
        expect(loginResult.user.id, equals('u-rejected-driver'));
        expect(AuthService.instance.currentUser?.id, equals('u-rejected-driver'));

        // 3. Release the slow boot check so its stale /auth/me & /auth/refresh finish with 401
        staleMeGate.complete();
        await bootCheckFuture;

        // 4. Newly logged-in session and fresh tokens must still be completely intact
        expect(AuthService.instance.currentUser?.id, equals('u-rejected-driver'));
        expect(AuthService.instance.authStateListenable.value?.id, equals('u-rejected-driver'));
        expect(await ApiClient.instance.getToken(), equals('token-fresh'));
        expect(await ApiClient.instance.getRefreshToken(), equals('refresh-fresh'));
      }, () => client);
    });
  });
}

