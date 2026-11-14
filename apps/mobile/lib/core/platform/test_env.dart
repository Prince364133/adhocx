import 'package:flutter/foundation.dart' show kIsWeb;

import 'test_env_io.dart' if (dart.library.js_interop) 'test_env_web.dart' as impl;

/// True when running under `flutter test` (platform views such as GoogleMap cannot be hosted there).
bool get isFlutterTest => !kIsWeb && impl.isFlutterTestEnv;
