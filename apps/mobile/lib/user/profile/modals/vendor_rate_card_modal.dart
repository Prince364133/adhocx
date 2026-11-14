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
  String _selectedVehicle = '';
  bool _isLoading = true;
  String? _error;
  String? _planVersion;
  String? _planCategory;
  double? _escortFeeRupees;
  List<Map<String, dynamic>> _slabs = [];
  List<Map<String, dynamic>> _vehicleCategories = [];

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
      if (_vehicleCategories.isEmpty) {
        final tiers = await UserService.instance.getPricingTiers(forceRefresh: true);
        _vehicleCategories = tiers.where((category) {
          final vehicleType = category['vehicleType'];
          return category['isActive'] != false &&
              vehicleType is String &&
              vehicleType.trim().isNotEmpty;
        }).toList();
      }
      if (_vehicleCategories.isEmpty) {
        if (!mounted) return;
        setState(() {
          _slabs = [];
          _error = 'No active vehicle categories are available.';
          _isLoading = false;
        });
        return;
      }
      if (!_vehicleCategories.any((category) => category['vehicleType'] == _selectedVehicle)) {
        _selectedVehicle = _vehicleCategories.first['vehicleType'] as String;
      }
      final card = await UserService.instance.getVendorRateCard(vehicleCategory: _selectedVehicle, forceRefresh: true);
      final slabs = (card['slabs'] as List?)?.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList() ?? [];
      if (!mounted) return;
      setState(() {
        _slabs = slabs;
        _planVersion = card['version']?.toString();
        _planCategory = card['vehicleCategory']?.toString();
        _escortFeeRupees = (card['escortFeeRupees'] as num?)?.toDouble();
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
              for (final category in _vehicleCategories)
                ChoiceChip(
                  label: Text(category['categoryLabel']?.toString() ?? category['vehicleType'].toString()),
                  selected: _selectedVehicle == category['vehicleType'],
                  onSelected: (_) {
                    setState(() => _selectedVehicle = category['vehicleType'] as String);
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
          if (_escortFeeRupees != null && _escortFeeRupees! > 0) ...[
            const SizedBox(height: 10),
            Text(
              'Optional Security Escort add-on: +₹${_escortFeeRupees!.toStringAsFixed(0)} per trip (set by platform policy).',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.accentPurple),
            ),
          ],
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
