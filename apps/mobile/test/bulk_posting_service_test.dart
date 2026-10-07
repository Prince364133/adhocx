import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/user/requirements/services/bulk_posting_service.dart';

void main() {
  group('BulkPostingService Unit Tests', () {
    test('generateExcelTemplate produces valid non-empty bytes and parses cleanly', () {
      final service = BulkPostingService.instance;
      final excelBytes = service.generateExcelTemplate();
      expect(excelBytes.isNotEmpty, true);

      final parseResult = service.parseFile(
        bytes: excelBytes,
        fileName: 'test_template.xlsx',
      );

      expect(parseResult.hasValidItems, true);
      expect(parseResult.validItems.length, 4);
      expect(parseResult.invalidItems.isEmpty, true);
      expect(parseResult.warnings.isEmpty, true);
      expect(parseResult.totalVehicles, 14); // 4 + 2 + 3 + 5

      final first = parseResult.validItems.first;
      expect(first.title, 'Executive Airport Transfer');
      expect(first.vehicleType, 'SEDAN');
      expect(first.quantity, 4);
      expect(first.ratePerVehicle, 1850);
      expect(first.pickupAddress.contains('Terminal 3'), true);
      expect(first.dropAddress.contains('Cyber City'), true);
    });

    test('generateCsvTemplate produces valid non-empty bytes and parses cleanly', () {
      final service = BulkPostingService.instance;
      final csvBytes = service.generateCsvTemplate();
      expect(csvBytes.isNotEmpty, true);

      final parseResult = service.parseFile(
        bytes: csvBytes,
        fileName: 'test_template.csv',
      );

      expect(parseResult.hasValidItems, true);
      expect(parseResult.validItems.length, 4);
      expect(parseResult.invalidItems.isEmpty, true);
      expect(parseResult.warnings.isEmpty, true);
      expect(parseResult.totalVehicles, 14);

      final second = parseResult.validItems[1];
      expect(second.title, 'Tech Park Employee Shuttle');
      expect(second.vehicleType, 'TEMPO_TRAVELLER');
      expect(second.quantity, 2);
      expect(second.ratePerVehicle, 4200);
    });
  });
}
