import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

enum TripStatusState {
  upcoming,
  assigned,
  enRoute,
  arrived,
  started,
  inProgress,
  completed,
  cancelled,
  noShow,
}

class UserTripDetailsScreen extends StatefulWidget {
  final TripStatusState initialStatus;
  final Map<String, dynamic>? trip;

  const UserTripDetailsScreen({
    super.key,
    this.initialStatus = TripStatusState.assigned,
    this.trip,
  });

  @override
  State<UserTripDetailsScreen> createState() => _UserTripDetailsScreenState();
}

class _UserTripDetailsScreenState extends State<UserTripDetailsScreen> {
  late TripStatusState _currentStatus;
  Map<String, dynamic>? _trip;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.initialStatus;
    if (widget.trip != null) {
      _trip = widget.trip;
      _isLoading = false;
      _deriveStateFromTrip();
    } else {
      _loadTrip();
    }
  }

  void _deriveStateFromTrip() {
    final status = _trip?['status'] as String?;
    if (status == 'COMPLETED') _currentStatus = TripStatusState.completed;
    if (status == 'CANCELLED') _currentStatus = TripStatusState.cancelled;
    if (status == 'IN_PROGRESS') _currentStatus = TripStatusState.inProgress;
    if (status == 'ARRIVED') _currentStatus = TripStatusState.arrived;
    if (status == 'ACCEPTED' || status == 'ASSIGNED') _currentStatus = TripStatusState.assigned;
  }

  Future<void> _loadTrip() async {
    setState(() => _isLoading = true);
    try {
      final list = await UserService.instance.getTrips();
      if (list.isNotEmpty && mounted) {
        setState(() {
          _trip = list.first as Map<String, dynamic>;
          _deriveStateFromTrip();
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _callDriver(String phone) async {
    final clean = phone.replaceAll(RegExp(r'[^\d+]'), '');
    if (clean.isEmpty) {
      Fluttertoast.showToast(msg: 'Driver contact phone not available');
      return;
    }
    final uri = Uri.parse('tel:$clean');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri);
      }
    } catch (_) {
      Fluttertoast.showToast(msg: 'Unable to open phone dialer');
    }
  }

  void _openChatWithDriver(Map<String, dynamic> trip, String driverName, String driverPhone) {
    context.push(AppRoutes.tripChatScreen, extra: {
      'tripId': trip['id'] ?? trip['tripId'],
      'otherPartyName': driverName,
      'otherPartyPhone': driverPhone,
      'otherPartyRole': 'DRIVER',
      'status': trip['status'] ?? 'IN_PROGRESS',
      'trip': trip,
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final trip = _trip ?? {};
    final driver = trip['driver'] as Map<String, dynamic>?;
    final driverUser = driver?['user'] as Map<String, dynamic>?;
    final driverName = driverUser?['fullName'] ?? driver?['fullName'] ?? 'Assigned Driver';
    final driverPhone = driver?['phone'] ?? driverUser?['phone'] ?? trip['driverPhone'] ?? '';
    final vehiclePlate = driver?['vehiclePlate'] ?? trip['vehiclePlate'] ?? '—';
    final vehicleModel = driver?['vehicleModel'] ?? trip['vehicleModel'] ?? trip['vehicleType'] ?? 'Commercial Fleet';
    final tripCode = trip['tripCode'] ?? trip['id'] ?? '—';

    final pickup = trip['pickupLocation'] as Map<String, dynamic>?;
    final drop = trip['dropLocation'] as Map<String, dynamic>?;
    final pickupAddr = pickup?['address'] ?? '—';
    final dropAddr = drop?['address'] ?? '—';
    final fare = trip['agreedRate'] ?? trip['fare'] ?? trip['ratePerVehicle'] ?? 0;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('Trip Details', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            onPressed: () {},
            icon: Icon(Icons.phone, color: AppColors.primary),
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  // State Switcher Carousel
                  Container(
                    height: 42,
                    margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 6),
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: TripStatusState.values.map((status) {
                        final isSelected = _currentStatus == status;
                        return Padding(
                          padding: const EdgeInsets.only(right: 6.0),
                          child: ChoiceChip(
                            label: Text(_getStatusLabel(status)),
                            selected: isSelected,
                            onSelected: (selected) {
                              if (selected) setState(() => _currentStatus = status);
                            },
                            selectedColor: _getStatusColor(status),
                            backgroundColor: isDark ? AppColors.surfaceDark : AppColors.slate200,
                            labelStyle: TextStyle(
                              color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                              fontSize: 11,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                  // Main Body Content
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header Title & Status Badge
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('$vehicleModel Trip', style: AppTypography.h2(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                                  Text(tripCode.toString(), style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _getStatusColor(_currentStatus).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                ),
                                child: Text(
                                  _getStatusLabel(_currentStatus),
                                  style: TextStyle(color: _getStatusColor(_currentStatus), fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: AppSpacing.md),

                          // Route Card
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.circle, size: 8, color: AppColors.success),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(pickupAddr, style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ),
                                const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 8.0),
                                  child: Divider(),
                                ),
                                Row(
                                  children: [
                                    const Icon(Icons.circle, size: 8, color: AppColors.error),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(dropAddr, style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: AppSpacing.lg),

                          // Driver Card
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: AppColors.primary,
                                  child: Text(
                                    driverName.isNotEmpty ? driverName.substring(0, 1).toUpperCase() : 'D',
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(driverName, style: AppTypography.caption(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                                      Text('$vehiclePlate • $vehicleModel', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: Icon(Icons.phone_outlined, size: 20, color: isDark ? AppColors.primaryLight : AppColors.primary),
                                  tooltip: 'Call Driver',
                                  onPressed: () => _callDriver(driverPhone),
                                ),
                                IconButton(
                                  icon: Icon(Icons.chat_bubble_outline_rounded, size: 20, color: isDark ? AppColors.primaryLight : AppColors.primary),
                                  tooltip: 'Chat with Driver',
                                  onPressed: () => _openChatWithDriver(trip, driverName, driverPhone),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text('₹ $fare', style: AppTypography.h4(color: AppColors.primary, fontWeight: FontWeight.bold)),
                                    Text('Fare Amount', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: AppSpacing.xl),

                          AppPrimaryButton(
                            text: 'Live Map Tracking',
                            onPressed: () => context.push(AppRoutes.userActiveTripScreen, extra: trip),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  String _getStatusLabel(TripStatusState state) {
    switch (state) {
      case TripStatusState.upcoming:
        return 'Upcoming';
      case TripStatusState.assigned:
        return 'Assigned';
      case TripStatusState.enRoute:
        return 'En Route';
      case TripStatusState.arrived:
        return 'Arrived';
      case TripStatusState.started:
        return 'Started';
      case TripStatusState.inProgress:
        return 'In Progress';
      case TripStatusState.completed:
        return 'Completed';
      case TripStatusState.cancelled:
        return 'Cancelled';
      case TripStatusState.noShow:
        return 'No Show';
    }
  }

  Color _getStatusColor(TripStatusState state) {
    switch (state) {
      case TripStatusState.upcoming:
      case TripStatusState.assigned:
      case TripStatusState.enRoute:
      case TripStatusState.inProgress:
        return AppColors.primary;
      case TripStatusState.arrived:
      case TripStatusState.started:
        return AppColors.warning;
      case TripStatusState.completed:
        return AppColors.success;
      case TripStatusState.cancelled:
      case TripStatusState.noShow:
        return AppColors.error;
    }
  }
}
