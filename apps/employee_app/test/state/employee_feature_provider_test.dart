import 'package:adhocx_employee/state/employee_feature_provider.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<EmployeeFeatureProvider> _createProvider() async {
  SharedPreferences.setMockInitialValues({});
  final preferences = await SharedPreferences.getInstance();
  final provider = EmployeeFeatureProvider(preferences: preferences);
  await Future<void>.delayed(const Duration(milliseconds: 20));
  return provider;
}

void main() {
  test('no-show count blocks trips and approval restores access', () async {
    final provider = await _createProvider();
    expect(provider.noShowCount, 2);

    await provider.recordNoShow(
      tripType: 'Evening Logout',
      tripReference: 'AX-LG-TEST',
    );
    expect(provider.noShowCount, 3);
    expect(provider.transportationBlocked, isTrue);
    expect(provider.noShowHistory.last['tripType'], 'Evening Logout');

    await provider.submitReactivation('I will arrive before the waiting period.');
    expect(provider.reactivationStatus, 'PENDING');
    await provider.simulateReactivationDecision(true);
    expect(provider.noShowCount, 0);
    expect(provider.transportationBlocked, isFalse);
    expect(provider.noShowHistory.length, 3);
  });

  test('address request remains pending and rejected request preserves address',
      () async {
    final provider = await _createProvider();
    final original = provider.registeredAddress.fullAddress;
    final proposed = provider.registeredAddress.copyWith(
      houseNumber: '99',
      locality: 'Sarjapur',
      pinCode: '560035',
    );

    await provider.submitAddressRequest(
      proposedAddress: proposed,
      reason: 'Temporary office relocation.',
    );
    expect(provider.addressRequests.last['status'], 'Pending');
    expect(provider.registeredAddress.fullAddress, original);

    final pendingId = provider.addressRequests.last['id'].toString();
    await provider.simulateAddressDecision(pendingId, false);
    expect(provider.addressRequests.last['status'], 'Rejected');
    expect(provider.registeredAddress.fullAddress, original);

    await provider.submitAddressRequest(
      proposedAddress: proposed,
      reason: 'Corrected address request.',
    );
    final secondId = provider.addressRequests.last['id'].toString();
    await provider.simulateAddressDecision(secondId, true);
    expect(provider.addressRequests.last['status'], 'Approved');
    expect(provider.registeredAddress.fullAddress, proposed.fullAddress);
  });

  test('only one pickup point is selected and confirmation is persisted',
      () async {
    final provider = await _createProvider();
    provider.selectPickupPoint('gateway');
    expect(provider.selectedPickupPoint?.id, 'gateway');

    provider.selectPickupPoint('mall');
    expect(provider.selectedPickupPoint?.id, 'mall');
    await provider.confirmPickupPoint();
    expect(provider.confirmedPickupPoint?.id, 'mall');
  });
}
