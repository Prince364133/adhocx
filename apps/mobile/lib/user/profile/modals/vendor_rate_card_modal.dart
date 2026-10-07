import 'package:flutter/material.dart';
import '../../../services/user_service.dart';
import '../../../shared/theme/app_colors.dart';

class VendorRateCardModal extends StatefulWidget {
  const VendorRateCardModal({super.key});

  @override
  State<VendorRateCardModal> createState() => _VendorRateCardModalState();
}

class _VendorRateCardModalState extends State<VendorRateCardModal> {
  String _selectedHub = 'HITEC_NANAKRAMGUDA';
  String _selectedVehicle = 'SEDAN';
  String _localitySearch = '';
  final TextEditingController _searchCtrl = TextEditingController();

  // Canonical Vendor 2026 Rate Card Matrix (matching users.pdf PRD)
  static const Map<String, Map<String, Map<String, dynamic>>>
      _vendorZonalMatrix = {
    'HITEC_NANAKRAMGUDA': {
      'Extra (E)': {'SEDAN': 500, 'SUV': 700, 'escort': '+₹200 / +₹300'},
      'Zone 6': {'SEDAN': 600, 'SUV': 900, 'escort': '+₹200 / +₹300'},
      'Zone 5': {'SEDAN': 700, 'SUV': 1000, 'escort': '+₹300 / +₹400'},
      'Zone 4': {'SEDAN': 800, 'SUV': 1100, 'escort': '+₹300 / +₹400'},
      'Zone 3': {'SEDAN': 900, 'SUV': 1200, 'escort': '+₹400 / +₹500'},
      'Zone 2': {'SEDAN': 1000, 'SUV': 1300, 'escort': '+₹400 / +₹500'},
      'Zone 1': {'SEDAN': 1100, 'SUV': 1400, 'escort': '+₹400 / +₹500'},
    },
    'KOKAPET': {
      'Extra (E)': {'SEDAN': 600, 'SUV': 800, 'escort': '+₹300 / +₹400'},
      'Zone 6': {'SEDAN': 700, 'SUV': 900, 'escort': '+₹300 / +₹400'},
      'Zone 5': {'SEDAN': 800, 'SUV': 1100, 'escort': '+₹300 / +₹400'},
      'Zone 4': {'SEDAN': 900, 'SUV': 1200, 'escort': '+₹300 / +₹400'},
      'Zone 3': {'SEDAN': 1000, 'SUV': 1300, 'escort': '+₹400 / +₹500'},
      'Zone 2': {'SEDAN': 1100, 'SUV': 1400, 'escort': '+₹400 / +₹500'},
      'Zone 1': {'SEDAN': 1200, 'SUV': 1500, 'escort': '+₹400 / +₹500'},
    },
  };

  // Sample quick locality reference
  static const Map<String, String> _sampleLocalities = {
    'Gachibowli': 'Extra (E)',
    'HITEC City': 'Extra (E)',
    'Madhapur': 'Extra (E)',
    'KPHB': 'Zone 6',
    'Manikonda': 'Zone 6',
    'Tolichowki': 'Zone 6',
    'Kukatpally': 'Zone 5',
    'Miyapur': 'Zone 5',
    'Begumpet': 'Zone 5',
    'Malakpet': 'Zone 4',
    'Dilsukhnagar': 'Zone 4',
    'Secunderabad': 'Zone 4',
    'LB Nagar': 'Zone 3',
    'Uppal': 'Zone 3',
    'Shamshabad': 'Zone 3',
    'Pocharam': 'Zone 2',
    'Cherlapally': 'Zone 2',
    'Hayathnagar': 'Zone 2',
    'Ghatkesar': 'Zone 1',
    'Shamirpet': 'Zone 1',
    'Medchal': 'Zone 1',
  };

  @override
  void initState() {
    super.initState();
    _loadRemoteRateCard();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  /// Live active rate card from the server (null while loading or offline; the bundled card is shown then).
  Map<String, dynamic>? _remoteCard;

  Future<void> _loadRemoteRateCard() async {
    final card =
        await UserService.instance.getVendorZonalRateCard(forceRefresh: true);
    if (mounted && card != null && card['matrix'] is Map) {
      setState(() => _remoteCard = card);
    }
  }

  /// Rows for the selected hub: [zone label, fare for selected vehicle, escort ceiling for selected vehicle].
  List<List<String>> _zoneRows() {
    final card = _remoteCard;
    if (card != null) {
      final hubMatrix = (card['matrix'] as Map)[_selectedHub];
      final zones =
          (card['zones'] as List?)?.whereType<Map>().toList() ?? const [];
      if (hubMatrix is Map && zones.isNotEmpty) {
        return zones.map((z) {
          final cell = hubMatrix[z['id']] as Map? ?? const {};
          final isSuv = _selectedVehicle == 'SUV';
          final fare = (isSuv ? cell['suv'] : cell['sedan']) as num? ?? 0;
          final escort =
              (isSuv ? cell['escortSuv'] : cell['escortSedan']) as num? ?? 0;
          return [
            '${z['label']}',
            '₹${fare.toStringAsFixed(0)}',
            'Escort up to +₹${escort.toStringAsFixed(0)} if selected'
          ];
        }).toList();
      }
    }
    final hubData = _vendorZonalMatrix[_selectedHub] ??
        _vendorZonalMatrix['HITEC_NANAKRAMGUDA']!;
    return hubData.entries
        .map((e) => [
              e.key,
              '₹${e.value[_selectedVehicle] ?? 0}',
              'Escort ${e.value['escort'] ?? ''} if selected'
            ])
        .toList();
  }

  /// Locality guide entries: name, zone label and whether the record can auto-quote.
  List<({String name, String zoneLabel, bool bookable})> _localities() {
    final list = _remoteCard?['localities'];
    if (list is List && list.isNotEmpty) {
      return list
          .whereType<Map>()
          .map((l) => (
                name: '${l['name']}',
                zoneLabel: '${l['zoneLabel']}',
                bookable: l['bookable'] == true
              ))
          .toList();
    }
    return _sampleLocalities.entries
        .map((e) => (name: e.key, zoneLabel: e.value, bookable: true))
        .toList();
  }

  String _fareForZoneLabel(String zoneLabel) {
    final row = _zoneRows().firstWhere((r) => r[0] == zoneLabel,
        orElse: () => const ['', '—', '']);
    return row[1];
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            width: 1.2,
          ),
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 38,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header
            Row(
              children: [
                const Icon(Icons.receipt_long_rounded,
                    color: AppColors.primary, size: 22),
                const SizedBox(width: 10),
                Text(
                  'Corporate Zonal Rate Card (2026)',
                  style: TextStyle(
                    color: isDark
                        ? AppColors.textPrimaryDark
                        : AppColors.textPrimaryLight,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 4, height: 4),
            Text(
              'Guaranteed flat rate pricing for Hyderabad employee fleet transport.',
              style: TextStyle(
                color: isDark
                    ? AppColors.textMutedDark
                    : AppColors.textSecondaryLight,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 16),

            // Hub Selector Pills
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () =>
                        setState(() => _selectedHub = 'HITEC_NANAKRAMGUDA'),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: _selectedHub == 'HITEC_NANAKRAMGUDA'
                          ? AppColors.primary.withValues(alpha: 0.15)
                          : Colors.transparent,
                      side: BorderSide(
                        color: _selectedHub == 'HITEC_NANAKRAMGUDA'
                            ? AppColors.primary
                            : Colors.grey.shade400,
                      ),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(
                      'HITEC / Nanakramguda',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: _selectedHub == 'HITEC_NANAKRAMGUDA'
                            ? AppColors.primary
                            : (isDark ? Colors.white70 : Colors.black87),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() => _selectedHub = 'KOKAPET'),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: _selectedHub == 'KOKAPET'
                          ? AppColors.primary.withValues(alpha: 0.15)
                          : Colors.transparent,
                      side: BorderSide(
                        color: _selectedHub == 'KOKAPET'
                            ? AppColors.primary
                            : Colors.grey.shade400,
                      ),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(
                      'Kokapet Hub',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: _selectedHub == 'KOKAPET'
                            ? AppColors.primary
                            : (isDark ? Colors.white70 : Colors.black87),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Vehicle Category Toggle
            Row(
              children: [
                ChoiceChip(
                  label: const Text('Sedan (4+1)'),
                  selected: _selectedVehicle == 'SEDAN',
                  onSelected: (val) =>
                      setState(() => _selectedVehicle = 'SEDAN'),
                  selectedColor: AppColors.primary.withValues(alpha: 0.2),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('SUV (6+1)'),
                  selected: _selectedVehicle == 'SUV',
                  onSelected: (val) => setState(() => _selectedVehicle = 'SUV'),
                  selectedColor: AppColors.primary.withValues(alpha: 0.2),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Quick Locality Lookup Search Bar
            TextField(
              controller: _searchCtrl,
              onChanged: (val) => setState(() => _localitySearch = val.trim()),
              decoration: InputDecoration(
                hintText:
                    'Search locality (e.g. Malakpet, Shamirpet, Miyapur)...',
                hintStyle: TextStyle(
                  fontSize: 12,
                  color: isDark
                      ? AppColors.textMutedDark
                      : AppColors.textMutedLight,
                ),
                prefixIcon: const Icon(Icons.search, size: 18),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(
                      color: isDark
                          ? AppColors.borderDark
                          : AppColors.borderLight),
                ),
              ),
            ),
            if (_localitySearch.isNotEmpty) ...[
              const SizedBox(height: 8),
              _buildSearchResultCard(context, isDark),
            ],
            const SizedBox(height: 14),

            // Rate Matrix Table
            _buildRateMatrix(context, isDark),
            const SizedBox(height: 14),

            // Enterprise SLA Banner
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.25)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.shield_outlined,
                      color: AppColors.primary, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Fixed B2B Contract: Zero dynamic surge, zero per-km meter fees. Escort service available for late-night employee compliance.',
                      style: TextStyle(
                        color:
                            isDark ? AppColors.primaryLight : AppColors.primary,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchResultCard(BuildContext context, bool isDark) {
    final q = _localitySearch.toLowerCase();
    final matches = _localities()
        .where((l) => l.name.toLowerCase().contains(q))
        .take(4)
        .toList();

    if (matches.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.amber.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          'Not in the approved locality list. Unlisted places need operations review before a zonal fare is offered.',
          style: TextStyle(
              fontSize: 11,
              color: isDark ? Colors.amber.shade200 : Colors.amber.shade900),
        ),
      );
    }

    return Column(
        children: matches.map((m) => _localityResultTile(m, isDark)).toList());
  }

  Widget _localityResultTile(
      ({String name, String zoneLabel, bool bookable}) entry, bool isDark) {
    final fare = entry.bookable
        ? '${_fareForZoneLabel(entry.zoneLabel)} Flat'
        : 'Ops review';
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.primary),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.name,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 13),
                ),
                Text(
                  entry.bookable
                      ? 'Assigned to ${entry.zoneLabel}'
                      : '${entry.zoneLabel} · pending pin verification',
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark
                        ? AppColors.textMutedDark
                        : AppColors.textSecondaryLight,
                  ),
                ),
              ],
            ),
          ),
          Text(
            fare,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRateMatrix(BuildContext context, bool isDark) {
    final rows = _zoneRows();

    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.surfaceElevatedDark
            : AppColors.surfaceElevatedLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        children: rows.asMap().entries.map((entry) {
          final i = entry.key;
          final row = entry.value;
          return Column(
            children: [
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          row[0],
                          style: TextStyle(
                            color: isDark
                                ? AppColors.textPrimaryDark
                                : AppColors.textPrimaryLight,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          row[2],
                          style: TextStyle(
                            color: isDark
                                ? AppColors.textMutedDark
                                : AppColors.textSecondaryLight,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      row[1],
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              if (i < rows.length - 1)
                Divider(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  height: 1,
                ),
            ],
          );
        }).toList(),
      ),
    );
  }
}
