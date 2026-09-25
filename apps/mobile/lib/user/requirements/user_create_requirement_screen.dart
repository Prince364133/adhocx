import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import 'requirement_draft_provider.dart';
import '../../services/driver_service.dart';

class UserCreateRequirementScreen extends StatefulWidget {
  const UserCreateRequirementScreen({super.key});

  @override
  State<UserCreateRequirementScreen> createState() => _UserCreateRequirementScreenState();
}

class _UserCreateRequirementScreenState extends State<UserCreateRequirementScreen> {
  late String _selectedFulfillmentMode;
  late String _selectedVehicleType;
  late int _quantity;
  int _passengersPerVehicle = 4;
  late double _suggestedBudget;
  late int _biddingWindowMinutes;
  late TextEditingController _budgetController;
  late TextEditingController _specialRequestsController;
  bool _initialized = false;
  bool _loadingCategories = true;

  List<Map<String, dynamic>> _vehicleOptions = [
    {
      'id': 'SEDAN',
      'label': 'Prime Sedan',
      'subtitle': '4 + 1 Passengers • ₹14.5/km',
      'icon': Icons.directions_car_rounded,
    },
    {
      'id': 'SUV',
      'label': 'SUV 7 Seater',
      'subtitle': '6 + 1 Passengers • ₹19/km',
      'icon': Icons.airport_shuttle_rounded,
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    try {
      final tiers = await DriverService.instance.getVehicleCategories();
      if (tiers.isNotEmpty && mounted) {
        setState(() {
          _vehicleOptions = tiers.map((t) {
            final vType = (t['vehicleType'] as String? ?? 'SEDAN').toUpperCase();
            final label = t['categoryLabel']?.toString() ?? vType;
            final seating = t['seatingCapacity']?.toString() ?? '4 + 1 Passengers';
            final desc = t['description']?.toString() ?? '';

            IconData icon = Icons.directions_car_rounded;
            if (vType == 'SUV') {
              icon = Icons.airport_shuttle_rounded;
            } else if (vType == 'HATCHBACK') {
              icon = Icons.electric_car_rounded;
            } else if (vType == 'BUS') {
              icon = Icons.directions_bus_rounded;
            }

            return {
              'id': vType,
              'label': label,
              'subtitle': seating.isNotEmpty ? seating : desc,
              'icon': icon,
            };
          }).toList();

          if (!_vehicleOptions.any((v) => v['id'] == _selectedVehicleType) && _vehicleOptions.isNotEmpty) {
            _selectedVehicleType = _vehicleOptions.first['id'] as String;
          }
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingCategories = false);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final draft = context.read<RequirementDraftProvider>();
      // Corporate Bulk / Direct Dispatch single mode
      _selectedFulfillmentMode = 'DIRECT_DISPATCH';

      final draftType = draft.vehicleType.toUpperCase();
      _selectedVehicleType = draftType.isNotEmpty ? draftType : 'SEDAN';
      if (!_vehicleOptions.any((v) => v['id'] == _selectedVehicleType)) {
        _selectedVehicleType = _vehicleOptions.isNotEmpty ? _vehicleOptions.first['id'] as String : 'SEDAN';
      }
      _quantity = draft.quantity > 0 ? draft.quantity : 5;
      _passengersPerVehicle = draft.passengers > 0 ? draft.passengers : (_selectedVehicleType == 'SUV' ? 6 : 4);
      _suggestedBudget = draft.suggestedBudget;
      _biddingWindowMinutes = draft.biddingWindowMinutes;
      _budgetController = TextEditingController(text: _suggestedBudget.toStringAsFixed(0));
      _specialRequestsController = TextEditingController(text: draft.specialRequests);
      _initialized = true;
    }
  }

  @override
  void dispose() {
    if (_initialized) {
      _budgetController.dispose();
      _specialRequestsController.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text(
          'Create Requirement',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () => context.push(AppRoutes.userBulkPostingScreen),
            icon: Icon(Icons.tune, color: AppColors.primary),
            tooltip: 'Bulk Upload CSV',
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Stepper Header (1 to 4)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(4, (index) {
                  final stepNum = index + 1;
                  final isActive = stepNum == 1;
                  return CircleAvatar(
                    radius: 14,
                    backgroundColor: isActive ? AppColors.primary : (isDark ? AppColors.slate800 : AppColors.slate300),
                    child: Text(
                      '$stepNum',
                      style: TextStyle(
                        fontSize: 12,
                        color: isActive ? Colors.white : AppColors.slate600,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  );
                }),
              ),
            ),

            const Divider(),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [

                    // Vehicle Type Dropdown Selector
                    Text(
                      'Vehicle Type *',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),

                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: _loadingCategories || _vehicleOptions.isEmpty
                          ? Container(
                              height: 64,
                              alignment: Alignment.centerLeft,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Row(
                                children: [
                                  const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    'Loading live vehicle categories...',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _vehicleOptions.any((v) => v['id'] == _selectedVehicleType)
                                    ? _selectedVehicleType
                                    : _vehicleOptions.first['id'] as String,
                                isExpanded: true,
                                itemHeight: 64.0,
                                icon: Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.primary),
                                dropdownColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.md),
                          selectedItemBuilder: (BuildContext context) {
                            return _vehicleOptions.map((v) {
                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(AppRadius.sm),
                                    ),
                                    child: Icon(v['icon'] as IconData, size: 18, color: AppColors.primary),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          v['label'] as String,
                                          style: AppTypography.body(
                                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        Text(
                                          v['subtitle'] as String,
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            }).toList();
                          },
                          items: _vehicleOptions.map((v) {
                            final isSelected = v['id'] == _selectedVehicleType;
                            return DropdownMenuItem<String>(
                              value: v['id'] as String,
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? AppColors.primary.withValues(alpha: 0.15)
                                          : (isDark ? AppColors.slate800 : AppColors.slate100),
                                      borderRadius: BorderRadius.circular(AppRadius.sm),
                                    ),
                                    child: Icon(
                                      v['icon'] as IconData,
                                      size: 18,
                                      color: isSelected ? AppColors.primary : (isDark ? AppColors.slate400 : AppColors.slate600),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          v['label'] as String,
                                          style: TextStyle(
                                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                            fontSize: 13,
                                            color: isSelected
                                                ? AppColors.primary
                                                : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                          ),
                                        ),
                                        Text(
                                          v['subtitle'] as String,
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (isSelected)
                                    Icon(Icons.check_circle_rounded, size: 18, color: AppColors.primary),
                                ],
                              ),
                            );
                          }).toList(),
                          onChanged: (newVal) {
                            if (newVal != null) {
                              setState(() => _selectedVehicleType = newVal);
                            }
                          },
                        ),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // When BIDDING / Outstation Mode: Show Target Budget & Auction Window
                    if (_selectedFulfillmentMode == 'BIDDING') ...[
                      // Target / Suggested Budget Field
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Target Budget per Trip *',
                            style: AppTypography.h4(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            'Starting Guide Price',
                            style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _budgetController,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.currency_rupee_rounded, size: 20),
                          hintText: 'e.g. 3500',
                          filled: true,
                          fillColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        ),
                        onChanged: (val) {
                          final parsed = double.tryParse(val);
                          if (parsed != null) _suggestedBudget = parsed;
                        },
                      ),
                      const SizedBox(height: 8),

                      // Quick budget chips
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [2500, 3500, 5000, 7500, 10000].map((b) {
                            final isSel = _suggestedBudget == b.toDouble();
                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text('₹$b'),
                                selected: isSel,
                                onSelected: (_) {
                                  setState(() {
                                    _suggestedBudget = b.toDouble();
                                    _budgetController.text = b.toString();
                                  });
                                },
                                selectedColor: AppColors.primary,
                                labelStyle: TextStyle(
                                  color: isSel ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // Bidding Auction Window
                      Text(
                        'Reverse Auction Window (Quotes Deadline) *',
                        style: AppTypography.h4(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<int>(
                            value: _biddingWindowMinutes,
                            isExpanded: true,
                            dropdownColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            items: const [
                              DropdownMenuItem(value: 15, child: Text('⚡ 15 Minutes (Express Quotes)')),
                              DropdownMenuItem(value: 30, child: Text('⏱️ 30 Minutes (Recommended)')),
                              DropdownMenuItem(value: 60, child: Text('⏳ 1 Hour (Maximum Driver Reach)')),
                              DropdownMenuItem(value: 120, child: Text('📅 2 Hours (Advance Outstation Booking)')),
                            ],
                            onChanged: (val) {
                              if (val != null) setState(() => _biddingWindowMinutes = val);
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),

                      // Explanatory info box for Reverse Auction
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.info_outline_rounded, size: 18, color: AppColors.primary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Once launched, nearby verified drivers will compete by submitting their lowest quotes & ETA. You can review and lock your preferred quote.',
                                style: TextStyle(
                                  fontSize: 12,
                                  height: 1.4,
                                  color: isDark ? AppColors.slate300 : AppColors.slate700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                    ] else ...[
                      // Corporate Bulk Mode: Quantity Stepper (1 to 50)
                      Text(
                        'Fleet Quantity (Vehicles) *',
                        style: AppTypography.h4(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            IconButton(
                              onPressed: () {
                                if (_quantity > 1) setState(() => _quantity--);
                              },
                              icon: Icon(Icons.remove, color: AppColors.primary),
                            ),
                            Text(
                              '$_quantity Vehicles',
                              style: AppTypography.h3(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            IconButton(
                              onPressed: () {
                                setState(() => _quantity++);
                              },
                              icon: Icon(Icons.add, color: AppColors.primary),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // Total Passengers per Vehicle (Optional)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Passengers per Vehicle (Optional)',
                            style: AppTypography.h4(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            'Max ${_selectedVehicleType == "SUV" ? "7" : "4"} Seats',
                            style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            IconButton(
                              onPressed: () {
                                if (_passengersPerVehicle > 1) setState(() => _passengersPerVehicle--);
                              },
                              icon: Icon(Icons.remove, color: AppColors.primary),
                            ),
                            Row(
                              children: [
                                Icon(Icons.person_rounded, size: 20, color: AppColors.primary),
                                const SizedBox(width: 8),
                                Text(
                                  '$_passengersPerVehicle ${_passengersPerVehicle > 1 ? "Passengers" : "Passenger"} / Cab',
                                  style: AppTypography.body(
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            IconButton(
                              onPressed: () {
                                final maxPass = _selectedVehicleType == 'SUV' ? 7 : 4;
                                if (_passengersPerVehicle < maxPass) setState(() => _passengersPerVehicle++);
                              },
                              icon: Icon(Icons.add, color: AppColors.primary),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // Continue Button -> Step 2
                      AppPrimaryButton(
                        text: 'Continue to Route →',
                        onPressed: () {
                          final draft = context.read<RequirementDraftProvider>();
                          draft.updateStep1(
                            fulfillmentMode: 'DIRECT_DISPATCH',
                            vehicleType: _selectedVehicleType,
                            quantity: _quantity,
                            passengers: _passengersPerVehicle,
                          );
                          context.push(AppRoutes.userCreateRequirementStep2Screen);
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
