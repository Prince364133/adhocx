import 'package:flutter/material.dart';
import '../../../core/networking/api_client.dart' show ApiException;
import '../../../services/user_service.dart';
import '../../../shared/theme/app_colors.dart';

/// Vendor rate card: the vendor charge per road-distance band, loaded from the active distance plan.
/// Nothing is bundled in the app; when the server has no active plan the card says so.
class VendorRateCardModal extends StatefulWidget {
  const VendorRateCardModal({super.key});

  @override
  State<VendorRateCardModal> createState() => _VendorRateCardModalState();
}

class _VendorRateCardModalState extends State<VendorRateCardModal> {
  String _selectedVehicle = 'SEDAN';
  bool _isLoading = true;
  String? _error;
  String? _planVersion;
  String? _planCategory;
  List<Map<String, dynamic>> _slabs = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final card = await UserService.instance.getVendorRateCard(vehicleCategory: _selectedVehicle, forceRefresh: true);
      final slabs = (card['slabs'] as List?)?.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList() ?? [];
      if (!mounted) return;
      setState(() {
        _slabs = slabs;
        _planVersion = card['version']?.toString();
        _planCategory = card['vehicleCategory']?.toString();
        _isLoading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _slabs = [];
        _error = e.message;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _slabs = [];
        _error = 'Could not load the rate card. Check your connection and try again.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryText = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final muted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

    return Container(
      padding: const EdgeInsets.all(20),
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
          Row(
            children: [
              const Icon(Icons.receipt_long_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text('Rate Card', style: TextStyle(color: primaryText, fontSize: 17, fontWeight: FontWeight.w700)),
              ),
              if (_planVersion != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text('v$_planVersion',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary)),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Fixed price per vehicle by Google Maps road distance between pickup and drop. No surge.',
            style: TextStyle(fontSize: 12, color: muted),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: [
              for (final v in const [('SEDAN', 'Sedan'), ('SUV', 'SUV')])
                ChoiceChip(
                  label: Text(v.$2),
                  selected: _selectedVehicle == v.$1,
                  onSelected: (_) {
                    setState(() => _selectedVehicle = v.$1);
                    _load();
                  },
                  selectedColor: AppColors.primary.withValues(alpha: 0.2),
                ),
            ],
          ),
          if (_planCategory == 'ALL' && !_isLoading && _error == null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text('Using the standard rate for all vehicle types.', style: TextStyle(fontSize: 11, color: muted)),
            ),
          const SizedBox(height: 12),
          Flexible(
            child: _isLoading
                ? const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
                : (_error != null || _slabs.isEmpty)
                    ? Padding(
                        padding: const EdgeInsets.symmetric(vertical: 24),
                        child: Text(_error ?? 'No rates are published for this vehicle type yet.',
                            style: TextStyle(fontSize: 12, color: muted)),
                      )
                    : Container(
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: ListView.separated(
                          shrinkWrap: true,
                          itemCount: _slabs.length,
                          separatorBuilder: (_, __) =>
                              Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          itemBuilder: (_, i) {
                            final s = _slabs[i];
                            final rupees = (s['vendorPriceRupees'] as num?) ??
                                ((s['vendorPricePaise'] as num?) != null ? (s['vendorPricePaise'] as num) / 100 : null);
                            return Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(s['range']?.toString() ?? '${s['minKm']}–${s['maxKm']} km',
                                        style: TextStyle(color: primaryText, fontSize: 13, fontWeight: FontWeight.bold)),
                                  ),
                                  Text(rupees != null ? '₹${rupees.toStringAsFixed(0)}' : '₹--',
                                      style: const TextStyle(color: AppColors.primary, fontSize: 14, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ),
          const SizedBox(height: 12),
          Text(
            'The price shown when you book is locked for that booking. Longer routes than the last band need an operations quote.',
            style: TextStyle(fontSize: 11, color: muted, fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }
}
