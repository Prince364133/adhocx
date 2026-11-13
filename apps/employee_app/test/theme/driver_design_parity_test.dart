// Guards the decision that the Employee app uses an EXACT copy of the Driver
// app's theme + shared widgets. If the driver design system changes, this test
// fails until the employee copy is refreshed (copy the file, keep the allowed
// differences listed below).
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
    for (final name in ['app_typography', 'app_spacing', 'app_radius']) {
      test('theme/$name.dart is identical', () {
        expectIdentical(
          _read('$_employeeRoot/theme/$name.dart'),
          _read('$_driverRoot/shared/theme/$name.dart'),
        );
      });
    }

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
      'app_bottom_sheet',
      'app_card',
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
  }, skip: driverAvailable ? false : 'Driver app sources not checked out');
}
