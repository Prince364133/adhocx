import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';

/// Shared body for the live-tracking connectivity states (GPS unavailable,
/// stale location, poor network, reconnecting). Title/message come from the
/// mock `liveTracking.exceptions[exceptionKey]` with built-in fallbacks.
class ConnectivityIssueView extends StatelessWidget {
  final String exceptionKey;
  final Widget illustration;
  final String fallbackTitle;
  final String fallbackMessage;
  final Widget? content;
  final List<Widget> actions;

  const ConnectivityIssueView({
    super.key,
    required this.exceptionKey,
    required this.illustration,
    required this.fallbackTitle,
    required this.fallbackMessage,
    this.content,
    this.actions = const [],
  });

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async {
        final tracking = await MockDataService.getLiveTracking();
        final exceptions = tracking['exceptions'] as Map<String, dynamic>?;
        return exceptions?[exceptionKey] as Map<String, dynamic>?;
      },
      builder: (context, data) => EmployeeCenteredLayout(
        appBar: const EmployeeAppBar(),
        illustration: illustration,
        illustrationGap: AppSpacing.xxl,
        title: data['title'] ?? fallbackTitle,
        message: data['message'] ?? fallbackMessage,
        content: content,
        actions: actions,
      ),
    );
  }
}
