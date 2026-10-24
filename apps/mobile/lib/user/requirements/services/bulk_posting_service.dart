import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:csv/csv.dart' as csv_pkg;
import 'package:excel/excel.dart' as xl;
import 'package:file_picker/file_picker.dart';
import 'package:universal_html/html.dart' as html;
import '../../../services/user_service.dart';
import '../models/bulk_requirement_item.dart';
import '../../../core/utils/app_toast.dart';

class BulkParseResult {
  final String fileName;
  final int fileSizeBytes;
  final List<BulkRequirementItem> validItems;
  final List<BulkRequirementItem> invalidItems;
  final List<String> warnings;
  final int totalRowsRead;

  BulkParseResult({
    required this.fileName,
    required this.fileSizeBytes,
    required this.validItems,
    required this.invalidItems,
    required this.warnings,
    required this.totalRowsRead,
  });

  bool get hasValidItems => validItems.isNotEmpty;
  int get totalVehicles => validItems.fold(0, (sum, i) => sum + i.quantity);
  double get totalEstimatedCost => validItems.fold(0.0, (sum, i) => sum + i.totalCost);

  Set<String> get vehicleTypes => validItems.map((i) => i.vehicleType).toSet();
}

class BulkPostResult {
  final int successCount;
  final int failedCount;
  final List<String> createdRequirementIds;
  final List<String> errors;

  BulkPostResult({
    required this.successCount,
    required this.failedCount,
    required this.createdRequirementIds,
    required this.errors,
  });

  bool get isFullSuccess => failedCount == 0 && successCount > 0;
  bool get isPartialSuccess => successCount > 0 && failedCount > 0;
}

class BulkPostingService {
  BulkPostingService._();
  static final BulkPostingService instance = BulkPostingService._();

  BulkParseResult? lastResult;

  static const List<String> templateHeaders = [
    'Title',
    'Vehicle Type',
    'Quantity',
    'Pickup Address',
    'Drop Address',
    'Reporting Time (YYYY-MM-DD HH:mm)',
    'Rate Per Vehicle (INR)',
    'Fulfillment Mode',
    'Notes',
    'Pickup Latitude (Optional)',
    'Pickup Longitude (Optional)',
    'Drop Latitude (Optional)',
    'Drop Longitude (Optional)',
  ];

  static List<List<dynamic>> get sampleRows {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    final tStr = '${tomorrow.year}-${tomorrow.month.toString().padLeft(2, '0')}-${tomorrow.day.toString().padLeft(2, '0')}';

    return [
      [
        'Executive Airport Transfer',
        'SEDAN',
        4,
        'Terminal 3, Indira Gandhi International Airport, New Delhi',
        'DLF Cyber City, Phase 2, Gurugram',
        '$tStr 08:30',
        1850,
        'DIRECT_DISPATCH',
        'AC Sedan required for corporate guests',
        28.5562,
        77.1000,
        28.4950,
        77.0895,
      ],
      [
        'Tech Park Employee Shuttle',
        'TEMPO_TRAVELLER',
        2,
        'Noida Sector 62 Metro Station, Sector 62, Noida',
        'DLF Cyber City, Sector 25A, Gurugram',
        '$tStr 09:00',
        4200,
        'DIRECT_DISPATCH',
        '16-seater Tempo Traveller with AC and clean interior',
        28.6280,
        77.3649,
        28.4912,
        77.0877,
      ],
      [
        'Leadership Summit VIP Cab',
        'SUV',
        3,
        'Aerocity Hospitality District, New Delhi',
        'ITC Grand Bharat, Hasanpur, Gurugram',
        '$tStr 10:30',
        3200,
        'BIDDING',
        'Innova Crysta or luxury SUV',
        28.5494,
        77.1215,
        28.3284,
        76.9152,
      ],
      [
        'Evening Shift Return Fleet',
        'SEDAN',
        5,
        'DLF Phase 5, Golf Course Road, Gurugram',
        'Indirapuram, Ghaziabad',
        '$tStr 19:30',
        1950,
        'DIRECT_DISPATCH',
        'Evening team drop',
        28.4410,
        77.0980,
        28.6384,
        77.3705,
      ],
    ];
  }

  /// Generates real Excel (.xlsx) template bytes
  Uint8List generateExcelTemplate() {
    final excel = xl.Excel.createExcel();
    final sheetName = 'Bulk_Requirements';
    final sheet = excel[sheetName];
    excel.setDefaultSheet(sheetName);
    if (excel.sheets.containsKey('Sheet1')) {
      excel.delete('Sheet1');
    }

    // Add Header Row
    sheet.appendRow(templateHeaders.map((h) => xl.TextCellValue(h)).toList());

    // Add Sample Rows
    for (final row in sampleRows) {
      sheet.appendRow(row.map<xl.CellValue?>((val) {
        if (val is int) return xl.IntCellValue(val);
        if (val is double) return xl.DoubleCellValue(val);
        return xl.TextCellValue(val?.toString() ?? '');
      }).toList());
    }

    final bytes = excel.encode()!;
    return Uint8List.fromList(bytes);
  }

  /// Generates real CSV (.csv) template bytes
  Uint8List generateCsvTemplate() {
    final allRows = <List<dynamic>>[
      templateHeaders,
      ...sampleRows,
    ];
    final csvString = csv_pkg.csv.encode(allRows);
    return Uint8List.fromList(utf8.encode(csvString));
  }

  /// Triggers client-side browser or native download
  Future<void> downloadTemplate({bool asExcel = true}) async {
    final fileName = asExcel
        ? 'AdhocX_Bulk_Requirements_Template.xlsx'
        : 'AdhocX_Bulk_Requirements_Template.csv';
    final mimeType = asExcel
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv;charset=utf-8';
    final bytes = asExcel ? generateExcelTemplate() : generateCsvTemplate();

    if (kIsWeb) {
      final blob = html.Blob([bytes], mimeType);
      final url = html.Url.createObjectUrlFromBlob(blob);
      html.AnchorElement(href: url)
        ..setAttribute('download', fileName)
        ..click();
      html.Url.revokeObjectUrl(url);
    } else {
      try {
        final ext = asExcel ? 'xlsx' : 'csv';
        await FilePicker.saveFile(
          dialogTitle: 'Save AdhocX Template',
          fileName: fileName,
          type: FileType.custom,
          allowedExtensions: [ext],
          bytes: bytes,
        );
      } catch (_) {
        // Fallback for non-web environments
        final blob = html.Blob([bytes], mimeType);
        final url = html.Url.createObjectUrlFromBlob(blob);
        html.AnchorElement(href: url)
          ..setAttribute('download', fileName)
          ..click();
        html.Url.revokeObjectUrl(url);
      }
    }
  }

  /// Opens file picker and parses chosen Excel or CSV file
  Future<BulkParseResult?> pickAndParseFile() async {
    final pickedFile = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: ['xlsx', 'xls', 'csv'],
    );

    if (pickedFile == null) {
      return null;
    }
    final bytes = await pickedFile.xFile.readAsBytes();
    if (bytes.isEmpty) {
      throw Exception('Selected file is empty or could not be read.');
    }
    final fileSize = await pickedFile.xFile.length();

    final parsed = parseFile(
      bytes: bytes,
      fileName: pickedFile.name,
      fileSize: fileSize,
    );

    lastResult = parsed;
    return parsed;
  }

  /// Parses byte data into BulkParseResult
  BulkParseResult parseFile({
    required Uint8List bytes,
    required String fileName,
    int? fileSize,
  }) {
    final isCsv = fileName.toLowerCase().endsWith('.csv');
    List<List<dynamic>> rawRows = [];

    if (isCsv) {
      final decodedString = utf8.decode(bytes, allowMalformed: true);
      rawRows = csv_pkg.csv.decode(decodedString);
    } else {
      final excelDoc = xl.Excel.decodeBytes(bytes);
      // Pick the first sheet that has rows
      xl.Sheet? targetSheet;
      for (final s in excelDoc.sheets.values) {
        if (s.rows.isNotEmpty) {
          targetSheet = s;
          break;
        }
      }

      if (targetSheet != null) {
        for (final row in targetSheet.rows) {
          final rowData = row.map<dynamic>((cell) {
            final cellVal = cell?.value;
            if (cellVal == null) return '';
            if (cellVal is xl.DateTimeCellValue) {
              final y = cellVal.year.toString().padLeft(4, '0');
              final m = cellVal.month.toString().padLeft(2, '0');
              final d = cellVal.day.toString().padLeft(2, '0');
              final hr = cellVal.hour.toString().padLeft(2, '0');
              final mn = cellVal.minute.toString().padLeft(2, '0');
              return '$y-$m-$d $hr:$mn';
            }
            if (cellVal is xl.IntCellValue) return cellVal.value;
            if (cellVal is xl.DoubleCellValue) return cellVal.value;
            if (cellVal is xl.TextCellValue) return cellVal.value;
            return cellVal.toString();
          }).toList();
          rawRows.add(rowData);
        }
      }
    }

    return _processRows(
      rawRows: rawRows,
      fileName: fileName,
      fileSize: fileSize ?? bytes.length,
    );
  }

  BulkParseResult _processRows({
    required List<List<dynamic>> rawRows,
    required String fileName,
    required int fileSize,
  }) {
    if (rawRows.isEmpty) {
      return BulkParseResult(
        fileName: fileName,
        fileSizeBytes: fileSize,
        validItems: [],
        invalidItems: [],
        warnings: ['File is empty and contains no rows.'],
        totalRowsRead: 0,
      );
    }

    // 1. Locate Header Row
    int headerRowIndex = -1;
    Map<String, int> colMap = {};

    for (int i = 0; i < rawRows.length && i < 5; i++) {
      final row = rawRows[i];
      final stringRow = row.map((c) => c?.toString().trim().toLowerCase() ?? '').toList();
      final hasVehicle = stringRow.any((s) => s.contains('vehicle'));
      final hasPickup = stringRow.any((s) => s.contains('pickup'));
      final hasQty = stringRow.any((s) => s.contains('quant') || s.contains('qty'));

      if (hasVehicle || (hasPickup && hasQty)) {
        headerRowIndex = i;
        for (int col = 0; col < stringRow.length; col++) {
          final h = stringRow[col];
          if (h.contains('title')) {
            colMap['title'] = col;
          } else if (h.contains('rate') || h.contains('cost') || h.contains('budget') || h.contains('price') || h.contains('inr')) {
            colMap['rate'] = col;
          } else if (h.contains('vehicle') || h.contains('cab type') || h.contains('car')) {
            colMap['vehicle'] = col;
          } else if (h.contains('quant') || h.contains('qty') || h.contains('count') || h.contains('cabs')) {
            colMap['quantity'] = col;
          } else if (h.contains('pickup') && (h.contains('lat') || h.contains('latitude'))) {
            colMap['pickupLat'] = col;
          } else if (h.contains('pickup') && (h.contains('lng') || h.contains('lon') || h.contains('longitude'))) {
            colMap['pickupLng'] = col;
          } else if (h.contains('pickup')) {
            colMap['pickup'] = col;
          } else if (h.contains('drop') && (h.contains('lat') || h.contains('latitude'))) {
            colMap['dropLat'] = col;
          } else if (h.contains('drop') && (h.contains('lng') || h.contains('lon') || h.contains('longitude'))) {
            colMap['dropLng'] = col;
          } else if (h.contains('drop') || h.contains('destination')) {
            colMap['drop'] = col;
          } else if (h.contains('report') || h.contains('time') || h.contains('date')) {
            colMap['time'] = col;
          } else if (h.contains('mode') || h.contains('fulfillment')) {
            colMap['mode'] = col;
          } else if (h.contains('notes') || h.contains('instruct') || h.contains('remark')) {
            colMap['notes'] = col;
          }
        }
        break;
      }
    }

    final dataStartIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
    final List<BulkRequirementItem> validItems = [];
    final List<BulkRequirementItem> invalidItems = [];
    final List<String> warnings = [];

    // Fallback column index mapping if no headers found
    final int titleCol = colMap['title'] ?? 0;
    final int vehicleCol = colMap['vehicle'] ?? 1;
    final int qtyCol = colMap['quantity'] ?? 2;
    final int pickupCol = colMap['pickup'] ?? 3;
    final int dropCol = colMap['drop'] ?? 4;
    final int timeCol = colMap['time'] ?? 5;
    final int rateCol = colMap['rate'] ?? 6;
    final int modeCol = colMap['mode'] ?? 7;
    final int notesCol = colMap['notes'] ?? 8;
    final int? pLatCol = colMap['pickupLat'];
    final int? pLngCol = colMap['pickupLng'];
    final int? dLatCol = colMap['dropLat'];
    final int? dLngCol = colMap['dropLng'];

    int totalProcessed = 0;

    for (int r = dataStartIndex; r < rawRows.length; r++) {
      final row = rawRows[r];
      // Check if row is completely empty
      final isRowEmpty = row.every((c) => c == null || c.toString().trim().isEmpty);
      if (isRowEmpty) continue;

      totalProcessed++;
      final rowErrors = <String>[];

      dynamic getVal(int? colIdx) {
        if (colIdx == null || colIdx < 0 || colIdx >= row.length) return null;
        return row[colIdx];
      }

      // Title
      String title = getVal(titleCol)?.toString().trim() ?? '';
      if (title.isEmpty) {
        title = 'Bulk Trip #${validItems.length + 1}';
      }

      // Vehicle Type
      final rawVehicle = getVal(vehicleCol)?.toString().trim().toUpperCase() ?? '';
      final vehicleType = _normalizeVehicleType(rawVehicle);

      // Quantity
      final rawQty = getVal(qtyCol);
      int quantity = 1;
      if (rawQty is num) {
        quantity = rawQty.toInt();
      } else if (rawQty != null) {
        quantity = int.tryParse(rawQty.toString().trim()) ?? 1;
      }
      if (quantity <= 0) {
        quantity = 1;
      }

      // Pickup Address
      final pickup = getVal(pickupCol)?.toString().trim() ?? '';
      if (pickup.isEmpty) {
        rowErrors.add('Pickup address is required');
      }

      // Drop Address
      final drop = getVal(dropCol)?.toString().trim() ?? '';
      if (drop.isEmpty) {
        rowErrors.add('Drop address is required');
      }

      // Reporting Time
      final rawTime = getVal(timeCol);
      final reportingTime = _parseDateTime(rawTime);

      // Rate
      final rawRate = getVal(rateCol);
      double ratePerVehicle = 0.0;
      if (rawRate is num) {
        ratePerVehicle = rawRate.toDouble();
      } else if (rawRate != null) {
        ratePerVehicle = double.tryParse(rawRate.toString().replaceAll('₹', '').replaceAll(',', '').trim()) ?? 0.0;
      }
      if (ratePerVehicle <= 0) {
        ratePerVehicle = _defaultRateForVehicle(vehicleType);
      }

      // Mode
      final rawMode = getVal(modeCol)?.toString().trim().toUpperCase() ?? '';
      final mode = rawMode.contains('BID') ? 'BIDDING' : 'DIRECT_DISPATCH';

      // Notes
      final notes = getVal(notesCol)?.toString().trim();

      // Coordinates
      final pLat = _parseDouble(getVal(pLatCol)) ?? 28.5562;
      final pLng = _parseDouble(getVal(pLngCol)) ?? 77.1000;
      final dLat = _parseDouble(getVal(dLatCol)) ?? 28.4950;
      final dLng = _parseDouble(getVal(dLngCol)) ?? 77.0895;

      final item = BulkRequirementItem(
        rowIndex: r + 1,
        title: title,
        vehicleType: vehicleType,
        quantity: quantity,
        pickupAddress: pickup.isEmpty ? 'Delhi NCR Pickup Hub' : pickup,
        pickupLat: pLat,
        pickupLng: pLng,
        dropAddress: drop.isEmpty ? 'Gurugram Drop Hub' : drop,
        dropLat: dLat,
        dropLng: dLng,
        reportingTime: reportingTime,
        ratePerVehicle: ratePerVehicle,
        fulfillmentMode: mode,
        notes: notes,
        isValid: rowErrors.isEmpty,
        errors: rowErrors,
      );

      if (item.isValid) {
        validItems.add(item);
      } else {
        invalidItems.add(item);
      }
    }

    if (validItems.isEmpty && invalidItems.isEmpty) {
      warnings.add('No valid data rows found in the sheet. Please ensure your file has data.');
    } else if (invalidItems.isNotEmpty) {
      warnings.add('${invalidItems.length} rows were skipped due to missing pickup/drop addresses.');
    }

    return BulkParseResult(
      fileName: fileName,
      fileSizeBytes: fileSize,
      validItems: validItems,
      invalidItems: invalidItems,
      warnings: warnings,
      totalRowsRead: totalProcessed,
    );
  }

  String _normalizeVehicleType(String raw) {
    final s = raw.replaceAll(' ', '_').replaceAll('-', '_');
    if (s.contains('SUV')) return 'SUV';
    if (s.contains('TEMPO') || s.contains('TRAVELLER') || s.contains('TT')) return 'TEMPO_TRAVELLER';
    if (s.contains('HATCH')) return 'HATCHBACK';
    if (s.contains('BUS')) return 'BUS';
    if (s.contains('ACE')) return 'TATA_ACE';
    if (s.contains('TRUCK') || s.contains('PICKUP')) return 'PICKUP_TRUCK';
    return 'SEDAN';
  }

  DateTime _parseDateTime(dynamic val) {
    if (val == null) {
      return DateTime.now().add(const Duration(days: 1, hours: 2));
    }
    if (val is DateTime) return val;

    final str = val.toString().trim();
    if (str.isEmpty) {
      return DateTime.now().add(const Duration(days: 1, hours: 2));
    }

    // Try standard ISO parse
    try {
      return DateTime.parse(str);
    } catch (_) {}

    // Try parsing "YYYY-MM-DD HH:mm"
    final ymdRegex = RegExp(r'^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?');
    final matchYmd = ymdRegex.firstMatch(str);
    if (matchYmd != null) {
      final y = int.parse(matchYmd.group(1)!);
      final m = int.parse(matchYmd.group(2)!);
      final d = int.parse(matchYmd.group(3)!);
      final hr = matchYmd.group(4) != null ? int.parse(matchYmd.group(4)!) : 9;
      final mn = matchYmd.group(5) != null ? int.parse(matchYmd.group(5)!) : 0;
      return DateTime(y, m, d, hr, mn);
    }

    // Try parsing "DD-MM-YYYY HH:mm" or "DD/MM/YYYY HH:mm"
    final dmyRegex = RegExp(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?');
    final matchDmy = dmyRegex.firstMatch(str);
    if (matchDmy != null) {
      final d = int.parse(matchDmy.group(1)!);
      final m = int.parse(matchDmy.group(2)!);
      final y = int.parse(matchDmy.group(3)!);
      final hr = matchDmy.group(4) != null ? int.parse(matchDmy.group(4)!) : 9;
      final mn = matchDmy.group(5) != null ? int.parse(matchDmy.group(5)!) : 0;
      return DateTime(y, m, d, hr, mn);
    }

    return DateTime.now().add(const Duration(days: 1, hours: 2));
  }

  double _defaultRateForVehicle(String vehicleType) {
    switch (vehicleType) {
      case 'SUV':
        return 2400.0;
      case 'TEMPO_TRAVELLER':
        return 4500.0;
      case 'BUS':
        return 8500.0;
      case 'HATCHBACK':
        return 1200.0;
      case 'TATA_ACE':
        return 1400.0;
      case 'PICKUP_TRUCK':
        return 1800.0;
      default:
        return 1650.0;
    }
  }

  double? _parseDouble(dynamic val) {
    if (val == null) return null;
    if (val is num) return val.toDouble();
    return double.tryParse(val.toString().trim());
  }

  /// Posts all valid items to the backend via UserService
  Future<BulkPostResult> postBulkRequirements(
    List<BulkRequirementItem> items, {
    Function(int current, int total)? onProgress,
  }) async {
    final List<String> createdIds = [];
    final List<String> errors = [];
    int successCount = 0;
    int failedCount = 0;

    for (int i = 0; i < items.length; i++) {
      final item = items[i];
      onProgress?.call(i + 1, items.length);

      try {
        final res = await UserService.instance.createRequirement(
          title: item.title,
          vehicleType: item.vehicleType,
          quantity: item.quantity,
          pickupAddress: item.pickupAddress,
          pickupLat: item.pickupLat,
          pickupLng: item.pickupLng,
          dropAddress: item.dropAddress,
          dropLat: item.dropLat,
          dropLng: item.dropLng,
          reportingTime: item.reportingTime,
          fulfillmentMode: item.fulfillmentMode,
          ratePerVehicle: item.ratePerVehicle > 0 ? item.ratePerVehicle : null,
          notes: item.notes,
        );

        if (res is Map && res['id'] != null) {
          createdIds.add(res['id'].toString());
        } else {
          createdIds.add('REQ-${DateTime.now().millisecondsSinceEpoch}-${i + 1}');
        }
        successCount++;
      } catch (e) {
        failedCount++;
        final cleanMsg = AppToast.cleanErrorMessage(e);
        errors.add('Row #${item.rowIndex} (${item.title}): $cleanMsg');
      }
    }

    return BulkPostResult(
      successCount: successCount,
      failedCount: failedCount,
      createdRequirementIds: createdIds,
      errors: errors,
    );
  }
}
