import 'package:adhocx_employee/features/profile_settings/profile/manage_emergency_contacts_screen.dart';
import 'package:adhocx_employee/shared/components/buttons/employee_primary_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late GoRouter router;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    router = GoRouter(
      initialLocation: '/profile/manage-contacts',
      routes: [
        GoRoute(
          path: '/profile/manage-contacts',
          builder: (_, __) => const ManageEmergencyContactsScreen(),
        ),
        GoRoute(
          path: '/profile/manage-contacts/form',
          builder: (_, state) => EmergencyContactFormScreen(
            contact: state.extra is EmployeeEmergencyContact
                ? state.extra as EmployeeEmergencyContact
                : null,
          ),
        ),
      ],
    );
  });

  tearDown(() => router.dispose());

  testWidgets('adds, edits, and deletes an emergency contact', (tester) async {
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();

    expect(find.text('No emergency contacts yet'), findsOneWidget);

    await tester.tap(find.text('Add Contact'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'Casey Example');
    await tester.enterText(
      find.byType(TextFormField).at(1),
      '+1 555 123 4567',
    );
    await tester.tap(find.byType(EmployeePrimaryButton));
    await tester.pumpAndSettle();

    expect(find.text('Casey Example'), findsOneWidget);
    expect(find.text('+1 555 123 4567'), findsOneWidget);

    await tester.ensureVisible(find.text('Casey Example'));
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.edit_outlined));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'Casey Updated');
    await tester.tap(find.byType(EmployeePrimaryButton));
    await tester.pumpAndSettle();

    expect(find.text('Casey Updated'), findsOneWidget);
    expect(find.text('Casey Example'), findsNothing);

    await tester.ensureVisible(find.text('Casey Updated'));
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.delete_outline_rounded));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();

    expect(find.text('No emergency contacts yet'), findsOneWidget);
  });
}
