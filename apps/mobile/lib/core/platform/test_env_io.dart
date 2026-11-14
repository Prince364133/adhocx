import 'dart:io' show Platform;

bool get isFlutterTestEnv => Platform.environment.containsKey('FLUTTER_TEST');
