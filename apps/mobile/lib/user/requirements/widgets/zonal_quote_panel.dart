import 'package:flutter/material.dart';
import '../../../core/networking/api_client.dart';
import '../../../services/user_service.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_radius.dart';

/// Current corporate zonal selection reported to the parent screen.
class ZonalSelection {
  final bool enabled;

  /// Server quote (vendor view). `canAutoQuote == false` means operations review is required.
  final Map<String, dynamic>? quote;

  const ZonalSelection({required this.enabled, this.quote});

  bool get hasBookableQuote =>
      enabled &&
      quote != null &&
      quote!['canAutoQuote'] == true &&
      quote!['quoteId'] != null;

  String? get quoteId => hasBookableQuote ? quote!['quoteId'] as String : null;

  double? get totalAmount =>
      hasBookableQuote ? (quote!['totalAmount'] as num?)?.toDouble() : null;

  bool get isExpired {
    final raw = quote?['expiresAt'];
    final expiry = raw is String ? DateTime.tryParse(raw) : null;
    return expiry != null && expiry.isBefore(DateTime.now());
  }
}

/// Hyderabad corporate zonal rate card panel for the vendor booking review step.
///
/// The vendor explicitly picks the office hub, which endpoint is the office, and the employee locality
/// (by stable ID). The server resolves the zone, validates pins and returns a stored quote.
class ZonalQuotePanel extends StatefulWidget {
  final String vehicleType;
  final double pickupLat;
  final double pickupLng;
  final double dropLat;
  final double dropLng;
  final ValueChanged<ZonalSelection> onChanged;

  final bool? initialEnabled;
  final String? initialHubId;
  final String? initialDirection;
  final Map<String, dynamic>? initialLocality;
  final bool? initialHasEscort;
  final Map<String, dynamic>? initialQuote;

  const ZonalQuotePanel({
    super.key,
    required this.vehicleType,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropLat,
    required this.dropLng,
    required this.onChanged,
    this.initialEnabled,
    this.initialHubId,
    this.initialDirection,
    this.initialLocality,
    this.initialHasEscort,
    this.initialQuote,
  });

  static bool supportsVehicle(String vehicleType) {
    final v = vehicleType.trim().toUpperCase();
    return v == 'SEDAN' || v == 'SUV';
  }

  @override
  State<ZonalQuotePanel> createState() => ZonalQuotePanelState();
}

class ZonalQuotePanelState extends State<ZonalQuotePanel> {
  static const _hubs = [
    {'id': 'HITEC_NANAKRAMGUDA', 'label': 'HITEC / Nanakramguda'},
    {'id': 'KOKAPET', 'label': 'Kokapet'},
  ];

  late bool _enabled;
  late String _hubId;
  late String _direction;
  Map<String, dynamic>? _locality;
  late bool _hasEscort;
  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _quote;

  @override
  void initState() {
    super.initState();
    _enabled = widget.initialEnabled ?? false;
    _hubId = widget.initialHubId ?? 'HITEC_NANAKRAMGUDA';
    _direction = widget.initialDirection ?? 'INBOUND_TO_OFFICE';
    _locality = widget.initialLocality;
    _hasEscort = widget.initialHasEscort ?? false;
    _quote = widget.initialQuote;
    if (_enabled && _locality != null && _quote == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        refreshQuote();
      });
    }
  }

  @override
  void didUpdateWidget(covariant ZonalQuotePanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    final routeChanged = oldWidget.pickupLat != widget.pickupLat ||
        oldWidget.pickupLng != widget.pickupLng ||
        oldWidget.dropLat != widget.dropLat ||
        oldWidget.dropLng != widget.dropLng ||
        oldWidget.vehicleType != widget.vehicleType;
    if (routeChanged && _enabled) {
      refreshQuote();
    }
  }

  void _emit() =>
      widget.onChanged(ZonalSelection(enabled: _enabled, quote: _quote));

  /// Requests a fresh quote for the current selection (also used when the stored quote expired).
  Future<void> refreshQuote() async {
    if (!_enabled || _locality == null) {
      setState(() {
        _quote = null;
        _error = null;
      });
      _emit();
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await UserService.instance.createZonalQuote(
        officeHubId: _hubId,
        direction: _direction,
        localityId: _locality!['id'] as String,
        vehicleType: widget.vehicleType.trim().toUpperCase(),
        hasEscort: _hasEscort,
        pickupLat: widget.pickupLat,
        pickupLng: widget.pickupLng,
        dropLat: widget.dropLat,
        dropLng: widget.dropLng,
      );
      if (!mounted) return;
      setState(() {
        _quote = res;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _quote = null;
        _loading = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _quote = null;
        _loading = false;
        _error =
            'Could not fetch the corporate quote. Check your connection and try again.';
      });
    }
    _emit();
  }

  Future<void> _pickLocality() async {
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const ZonalLocalityPickerSheet(),
    );
    if (picked != null) {
      setState(() => _locality = picked);
      refreshQuote();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final muted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    final primaryText =
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SwitchListTile(
            value: _enabled,
            contentPadding: EdgeInsets.zero,
            secondary: const Icon(Icons.corporate_fare_rounded,
                color: AppColors.primary),
            title: Text('Corporate zonal rate card',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: primaryText)),
            subtitle: Text(
                'Hyderabad employee transport · fixed fare by office hub and zone',
                style: TextStyle(fontSize: 11, color: muted)),
            onChanged: (v) {
              setState(() {
                _enabled = v;
                if (!v) {
                  _quote = null;
                  _error = null;
                }
              });
              if (v && _locality != null) {
                refreshQuote();
              } else {
                _emit();
              }
            },
          ),
          if (_enabled) ...[
            const SizedBox(height: 4),
            Text('Office hub',
                style: TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w600, color: muted)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: _hubs
                  .map((h) => ChoiceChip(
                        label: Text(h['label']!),
                        selected: _hubId == h['id'],
                        onSelected: (_) {
                          setState(() => _hubId = h['id']!);
                          refreshQuote();
                        },
                      ))
                  .toList(),
            ),
            const SizedBox(height: 10),
            Text('Which end is the office?',
                style: TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w600, color: muted)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('Drop (home → office)'),
                  selected: _direction == 'INBOUND_TO_OFFICE',
                  onSelected: (_) {
                    setState(() => _direction = 'INBOUND_TO_OFFICE');
                    refreshQuote();
                  },
                ),
                ChoiceChip(
                  label: const Text('Pickup (office → home)'),
                  selected: _direction == 'OUTBOUND_FROM_OFFICE',
                  onSelected: (_) {
                    setState(() => _direction = 'OUTBOUND_FROM_OFFICE');
                    refreshQuote();
                  },
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text('Employee locality',
                style: TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w600, color: muted)),
            const SizedBox(height: 6),
            OutlinedButton.icon(
              onPressed: _pickLocality,
              icon: const Icon(Icons.place_outlined, size: 18),
              label: Text(
                _locality == null
                    ? 'Select locality'
                    : '${_locality!['name']} · ${_locality!['zoneLabel']}',
                overflow: TextOverflow.ellipsis,
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(42),
                alignment: Alignment.centerLeft,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.sm)),
              ),
            ),
            SwitchListTile(
              value: _hasEscort,
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.security, color: AppColors.primary),
              title: Text('Security escort service',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: primaryText)),
              subtitle: Text(
                  'Added only when selected, up to the approved ceiling for this zone',
                  style: TextStyle(fontSize: 11, color: muted)),
              onChanged: (v) {
                setState(() => _hasEscort = v);
                refreshQuote();
              },
            ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(minHeight: 2),
              )
            else if (_error != null)
              _notice(Icons.error_outline, _error!, AppColors.error)
            else if (_quote != null && _quote!['canAutoQuote'] != true)
              _notice(
                Icons.support_agent,
                '${_quote!['reason'] ?? 'This trip needs operations review before a zonal fare can be offered.'}',
                AppColors.warning,
              )
            else if (_quote != null)
              _quoteSummary(isDark, primaryText, muted),
          ],
        ],
      ),
    );
  }

  Widget _notice(IconData icon, String text, Color color) {
    return Container(
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(
              child: Text(text,
                  style: TextStyle(
                      fontSize: 12,
                      color: color,
                      fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }

  Widget _quoteSummary(bool isDark, Color primaryText, Color muted) {
    final q = _quote!;
    final hub = q['officeHub']?['displayName'] ?? '';
    final loc = q['locality'] ?? {};
    final lineItems =
        (q['lineItems'] as List?)?.whereType<Map>().toList() ?? const [];
    final expiry = DateTime.tryParse('${q['expiresAt'] ?? ''}')?.toLocal();
    final expiryLabel = expiry == null
        ? ''
        : 'Quote valid until ${expiry.hour.toString().padLeft(2, '0')}:${expiry.minute.toString().padLeft(2, '0')}';

    return Container(
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.verified_rounded,
                  color: AppColors.success, size: 16),
              const SizedBox(width: 6),
              Expanded(
                child: Text('${loc['name'] ?? ''} ↔ $hub',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: primaryText)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  '${(loc['zoneLabel'] ?? '').toString().toUpperCase()} · ₹${(q['baseFare'] as num?)?.toStringAsFixed(0) ?? ''}',
                  style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...lineItems.map((li) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    Expanded(
                        child: Text('${li['label']}',
                            style: TextStyle(fontSize: 11, color: muted))),
                    Text(
                        '₹${(li['amount'] as num?)?.toStringAsFixed(0) ?? '0'}',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: primaryText)),
                  ],
                ),
              )),
          const Divider(height: 14),
          Row(
            children: [
              Expanded(
                  child: Text('Total per vehicle',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: primaryText))),
              Text('₹${(q['totalAmount'] as num?)?.toStringAsFixed(0) ?? ''}',
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary)),
            ],
          ),
          const SizedBox(height: 6),
          Text('Corporate rate card applied. No surge, no per-km deviations.',
              style: const TextStyle(
                  fontSize: 10,
                  color: AppColors.success,
                  fontWeight: FontWeight.w600)),
          if (expiryLabel.isNotEmpty)
            Text('$expiryLabel · Rate version ${q['rateVersion'] ?? ''}',
                style: TextStyle(fontSize: 10, color: muted)),
        ],
      ),
    );
  }
}

class ZonalLocalityPickerSheet extends StatefulWidget {
  const ZonalLocalityPickerSheet({super.key});

  @override
  State<ZonalLocalityPickerSheet> createState() => _ZonalLocalityPickerSheetState();
}

class _ZonalLocalityPickerSheetState extends State<ZonalLocalityPickerSheet> {
  List<Map<String, dynamic>> _all = [];
  String _query = '';
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await UserService.instance.searchZonalLocalities();
      if (!mounted) return;
      setState(() {
        _all = list;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Could not load localities. Check your connection.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final q = _query.toLowerCase();
    final filtered = q.isEmpty
        ? _all
        : _all.where((l) {
            final name = '${l['name']}'.toLowerCase();
            final aliases =
                (l['aliases'] as List?)?.map((a) => '$a'.toLowerCase()) ??
                    const <String>[];
            return name.contains(q) || aliases.any((a) => a.contains(q));
          }).toList();

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      expand: false,
      builder: (ctx, scroll) => Material(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        clipBehavior: Clip.antiAlias,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Column(
          children: [
            TextField(
              autofocus: true,
              onChanged: (v) => setState(() => _query = v.trim()),
              decoration: InputDecoration(
                hintText: 'Search locality (e.g. Malakpet, KPHB, Shamirpet)',
                prefixIcon: const Icon(Icons.search, size: 18),
                isDense: true,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md)),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Text(_error!,
                              style: const TextStyle(color: AppColors.error)))
                      : filtered.isEmpty
                          ? const Center(
                              child: Text(
                                  'Not in the approved list. Unlisted places need operations review.',
                                  textAlign: TextAlign.center))
                          : ListView.builder(
                              controller: scroll,
                              itemCount: filtered.length,
                              itemBuilder: (_, i) {
                                final l = filtered[i];
                                final bookable = l['bookable'] == true;
                                return Material(
                                  color: Colors.transparent,
                                  child: ListTile(
                                    dense: true,
                                    title: Text('${l['name']}'),
                                    subtitle: Text(
                                      bookable
                                          ? '${l['zoneLabel']}'
                                          : '${l['zoneLabel']} · needs operations review',
                                      style: TextStyle(
                                          fontSize: 11,
                                          color: bookable
                                              ? null
                                              : AppColors.warning),
                                    ),
                                    trailing: bookable
                                        ? null
                                        : const Icon(Icons.support_agent,
                                            color: AppColors.warning, size: 18),
                                    onTap: () => Navigator.pop(context, l),
                                  ),
                                );
                              },
                            ),
            ),
          ],
        ),
        ),
      ),
    );
  }
}
