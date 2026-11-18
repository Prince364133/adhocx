// Guards the decision that the Employee app shares the Driver app's design
// system tokens + shared widgets, while explicitly documenting the 4 files
// that carry intentional Employee-app extensions (compact typography scale,
// pageHorizontal/cardPadding spacing tokens, scrollable AppBottomSheet handle,
// and AppCard.showTapFeedback).
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const _driverRoot = '../mobile/lib';
const _employeeRoot = 'lib';

/// Legacy alias block appended to the employee AppColors during migration.
const _legacyBanner = '  // ═══';

String _read(String path) =>
    File(path).readAsStringSync().replaceAll('\r\n', '\n').trimRight();

void main() {
  final driverAvailable = Directory(_driverRoot).existsSync();

  void expectIdentical(String employee, String driver, {String? reason}) {
    expect(employee, driver,
        reason: reason ??
            'Employee copy differs from the Driver app. Re-copy it from '
                'apps/mobile.');
  }

  group('Employee design system == Driver design system', () {
    test('theme/app_radius.dart is identical', () {
      expectIdentical(
        _read('$_employeeRoot/theme/app_radius.dart'),
        _read('$_driverRoot/shared/theme/app_radius.dart'),
      );
    });

    test('theme/app_typography.dart preserves Driver Inter typography API', () {
      final employee = _read('$_employeeRoot/theme/app_typography.dart');
      for (final token in [
        'GoogleFonts.inter(',
        'static TextStyle display(',
        'static TextStyle h1(',
        'static TextStyle h2(',
        'static TextStyle h3(',
        'static TextStyle h4(',
        'static TextStyle body(',
        'static TextStyle small(',
        'static TextStyle caption(',
        'static TextStyle micro(',
        'static TextStyle label(',
        'static TextStyle button(',
      ]) {
        expect(employee, contains(token));
      }
    });

    test('theme/app_spacing.dart preserves Driver spacing scale + Employee tokens',
        () {
      final employee = _read('$_employeeRoot/theme/app_spacing.dart');
      for (final token in [
        'static const double xs = 4.0;',
        'static const double sm = 8.0;',
        'static const double md = 12.0;',
        'static const double lg = 16.0;',
        'static const double xl = 20.0;',
        'static const double xxl = 24.0;',
        'static const double xxxl = 32.0;',
        'static const double huge = 48.0;',
        'static const double pageHorizontal = lg;',
        'static const EdgeInsets cardPadding = EdgeInsets.all(md);',
      ]) {
        expect(employee, contains(token));
      }
    });

    test('theme/app_colors.dart is identical above the legacy alias block', () {
      final employee = _read('$_employeeRoot/theme/app_colors.dart');
      final cut = employee.indexOf(_legacyBanner);
      final driver = _read('$_driverRoot/shared/theme/app_colors.dart');
      if (cut == -1) {
        // Phase 4 done: aliases removed → files must match exactly.
        expectIdentical(employee, driver);
        return;
      }
      final driverBody = driver.substring(0, driver.lastIndexOf('}'));
      expectIdentical(employee.substring(0, cut).trimRight(),
          driverBody.trimRight());
    });

    test('theme/app_theme.dart is identical apart from the import path', () {
      expectIdentical(
        _read('$_employeeRoot/theme/app_theme.dart'),
        _read('$_driverRoot/shared/theme/app_theme.dart').replaceFirst(
          "import 'package:adhocx/shared/theme/app_colors.dart';",
          "import 'app_colors.dart';",
        ),
      );
    });

    for (final name in [
      'app_badge',
      'app_phone_field',
      'app_primary_button',
      'app_secondary_button',
      'app_segmented_control',
      'app_stepper_header',
      'app_text_field',
    ]) {
      test('widgets/common/$name.dart is identical', () {
        expectIdentical(
          _read('$_employeeRoot/widgets/common/$name.dart'),
          _read('$_driverRoot/widgets/common/$name.dart'),
        );
      });
    }

    test('widgets/common/app_bottom_sheet.dart preserves Driver sheet + scrollController',
        () {
      final employee =
          _read('$_employeeRoot/widgets/common/app_bottom_sheet.dart');
      for (final token in [
        'class AppBottomSheet extends StatelessWidget',
        'static Future<T?> show<T>(',
        'final ScrollController? scrollController;',
        "ValueKey('app-bottom-sheet-handle')",
      ]) {
        expect(employee, contains(token));
      }
    });

    test('widgets/common/app_card.dart preserves Driver card + showTapFeedback',
        () {
      final employee = _read('$_employeeRoot/widgets/common/app_card.dart');
      for (final token in [
        'class AppCard extends StatelessWidget',
        'final bool showTapFeedback;',
        'AppRadius.borderLg',
      ]) {
        expect(employee, contains(token));
      }
    });
  }, skip: driverAvailable ? false : 'Driver app sources not checked out');
}
