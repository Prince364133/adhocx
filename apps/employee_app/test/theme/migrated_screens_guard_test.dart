// Phase 3 guard: once a feature folder is migrated to the Driver design
// system, it must stay on it. Add each folder to [migratedFolders] when its
// migration lands.
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const migratedFolders = <String>[
  'lib/features/auth',
];

/// Old employee-only colour names (temporary aliases in AppColors).
const _legacyColorNames = [
  'primaryBlue', 'primaryBlueDark', 'primaryBlueDarker', 'primaryBlueLight',
  'primaryBlueSoft', 'primaryPurple', 'primaryPurpleLight', 'secondaryOrange',
  'secondaryOrangeHover', 'secondaryOrangeLight', 'accentAmber',
  'accentAmberLight', 'accentAmberBorder', 'darkNavy', 'darkNavyCard',
  'background', 'surface', 'surfaceMuted', 'surfacePill', 'textPrimary',
  'textSecondary', 'textMuted', 'textLight', 'border', 'borderSubtle',
  'borderFocused', 'successLight', 'successBorder', 'errorLight',
  'errorBorder', 'warningLight', 'warningBorder', 'primaryGradient',
  'splashGradient', 'orangeGradient',
];

final _rules = <String, RegExp>{
  'inline GoogleFonts (use AppTypography)': RegExp(r'GoogleFonts\.'),
  'raw hex colour (use AppColors tokens)': RegExp(r'Color\(0x'),
  'legacy employee colour name (use Driver tokens / EmployeePalette)':
      RegExp('AppColors\\.(${_legacyColorNames.join('|')})\\b'),
  'redirect shim import (import the real file)': RegExp(
      r"widgets/(employee_(app_bar|bottom_nav_bar|otp_input|primary_button|secondary_button)|illustration_widgets|batch_\d+_illustrations|trip_step_tracker)\.dart"),
};

void main() {
  for (final folder in migratedFolders) {
    test('$folder uses only the Driver design system', () {
      final violations = <String>[];
      final files = Directory(folder)
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'));

      for (final file in files) {
        final lines = file.readAsLinesSync();
        for (var i = 0; i < lines.length; i++) {
          final line = lines[i];
          if (line.trimLeft().startsWith('//')) continue;
          _rules.forEach((why, pattern) {
            if (pattern.hasMatch(line)) {
              violations.add('${file.path}:${i + 1}  $why\n    ${line.trim()}');
            }
          });
        }
      }

      expect(violations, isEmpty, reason: violations.join('\n'));
    });
  }
}
