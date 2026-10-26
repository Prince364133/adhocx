import 'package:adhocx/shared/theme/app_colors.dart';
import 'package:flutter/material.dart';
import '../../../services/driver_service.dart';

class KycVehicleSectionWidget extends StatefulWidget {
  final String initialVehicleType;
  final ValueChanged<String> onVehicleTypeChanged;
  final ValueChanged<Map<String, String>> onSaved;

  const KycVehicleSectionWidget({
    super.key,
    required this.initialVehicleType,
    required this.onVehicleTypeChanged,
    required this.onSaved,
  });

  @override
  State<KycVehicleSectionWidget> createState() =>
      _KycVehicleSectionWidgetState();
}

class _KycVehicleSectionWidgetState extends State<KycVehicleSectionWidget> {
  late String _vehicleType;
  bool _isLoadingCategories = true;
  List<Map<String, dynamic>> _vehicleOptions = [];

  @override
  void initState() {
    super.initState();
    _vehicleType = widget.initialVehicleType.toUpperCase();
    _loadVehicleCategories();
  }

  Future<void> _loadVehicleCategories() async {
    try {
      final tiers = await DriverService.instance.getVehicleCategories(forceRefresh: true);
      final activeTiers = tiers.where((t) => t['isActive'] != false).toList();
      if (mounted && activeTiers.isNotEmpty) {
        setState(() {
          _vehicleOptions = activeTiers.map((t) => {
            'id': (t['vehicleType'] as String? ?? 'SEDAN').toUpperCase(),
            'label': t['categoryLabel'] as String? ?? t['vehicleType'] as String? ?? 'Vehicle',
            'iconKey': t['iconKey'] as String? ?? 'car',
          }).toList();
          _isLoadingCategories = false;
        });
        return;
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoadingCategories = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white12 : AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeader('3', 'Vehicle Details'),
          const SizedBox(height: 24),
          
          // Vehicle type toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Vehicle Category',
                style: TextStyle(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (_isLoadingCategories)
                const SizedBox(
                  width: 12,
                  height: 12,
                  child: CircularProgressIndicator(strokeWidth: 1.5, color: AppColors.success),
                ),
            ],
          ),
          const SizedBox(height: 10),
          if (_isLoadingCategories && _vehicleOptions.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                  SizedBox(width: 8),
                  Text('Loading live vehicle categories...', style: TextStyle(fontSize: 12)),
                ],
              ),
            )
          else if (_vehicleOptions.isEmpty)
            Row(
              children: [
                const Text('No categories loaded.', style: TextStyle(fontSize: 12)),
                TextButton(
                  onPressed: _loadVehicleCategories,
                  child: const Text('Retry', style: TextStyle(fontSize: 12)),
                ),
              ],
            )
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: _vehicleOptions.map((opt) {
                final id = (opt['id'] as String).toUpperCase();
                final label = opt['label'] as String;
                final isSelected = _vehicleType.toUpperCase() == id;
                final iconKey = opt['iconKey'] as String? ?? 'car';

                IconData iconData = Icons.directions_car_filled;
                if (iconKey == 'bike') {
                  iconData = Icons.two_wheeler_rounded;
                } else if (iconKey == 'truck') {
                  iconData = Icons.local_shipping_rounded;
                } else if (iconKey == 'bus') {
                  iconData = Icons.directions_bus_rounded;
                }

                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _vehicleType = id);
                      widget.onVehicleTypeChanged(id);
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.successContainer
                            : (isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.success
                              : (isDark ? AppColors.borderDark : AppColors.borderLight),
                          width: isSelected ? 1.5 : 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            iconData,
                            size: 16,
                            color: isSelected
                                ? AppColors.success
                                : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            label,
                            style: TextStyle(
                              color: isSelected
                                  ? AppColors.success
                                  : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                              fontSize: 13,
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 24),
          
          _field(
            isDark: isDark,
            label: 'Vehicle Number',
            hint: 'TS09EF1234',
            icon: Icons.directions_car_outlined,
            textCapitalization: TextCapitalization.characters,
            onSaved: (v) =>
                widget.onSaved({'vehicle_number': v?.toUpperCase() ?? ''}),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Required' : null,
          ),
          const SizedBox(height: 16),
          _field(
            isDark: isDark,
            label: 'Vehicle RC Number',
            hint: 'TS09EF1234RC',
            icon: Icons.article_outlined,
            textCapitalization: TextCapitalization.characters,
            onSaved: (v) =>
                widget.onSaved({'rc_number': v?.toUpperCase() ?? ''}),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Required' : null,
          ),
        ],
      ),
    );
  }

  Widget _field({
    required bool isDark,
    required String label,
    required String hint,
    required IconData icon,
    TextCapitalization textCapitalization = TextCapitalization.none,
    FormFieldSetter<String>? onSaved,
    FormFieldValidator<String>? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          textCapitalization: textCapitalization,
          style: TextStyle(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontSize: 14,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
            prefixIcon: Icon(
              icon, 
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, 
              size: 20,
            ),
            filled: true,
            fillColor: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
            contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.success),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.error),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.error),
            ),
          ),
          onSaved: onSaved,
          validator: validator,
        ),
      ],
    );
  }

  Widget _sectionHeader(String num, String title) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: AppColors.successContainer,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Center(
            child: Text(
              num,
              style: const TextStyle(
                color: AppColors.success,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Text(
          title,
          style: const TextStyle(
            color: AppColors.success,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}