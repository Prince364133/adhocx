/// Represents an authenticated corporate employee commuter.
class EmployeeUser {
  final String id;
  final String employeeId;
  final String fullName;
  final String organization;
  final String office;
  final String email;
  final String phone;
  final bool isTransportEligible;
  final String? profilePhotoUrl;
  final DateTime createdAt;

  const EmployeeUser({
    required this.id,
    required this.employeeId,
    required this.fullName,
    required this.organization,
    required this.office,
    required this.email,
    required this.phone,
    required this.isTransportEligible,
    this.profilePhotoUrl,
    required this.createdAt,
  });

  factory EmployeeUser.fromJson(Map<String, dynamic> json) {
    return EmployeeUser(
      id: json['id'] as String? ?? '',
      employeeId: json['employeeId'] as String? ?? 'EMP10294',
      fullName: json['fullName'] as String? ?? 'Corporate Employee',
      organization: json['organization'] as String? ?? 'Estemporaneo Tech Pvt. Ltd.',
      office: json['office'] as String? ?? 'HITEC City, Hyderabad',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      isTransportEligible: json['isTransportEligible'] as bool? ?? true,
      profilePhotoUrl: json['profilePhotoUrl'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'employeeId': employeeId,
      'fullName': fullName,
      'organization': organization,
      'office': office,
      'email': email,
      'phone': phone,
      'isTransportEligible': isTransportEligible,
      'profilePhotoUrl': profilePhotoUrl,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  EmployeeUser copyWith({
    String? id,
    String? employeeId,
    String? fullName,
    String? organization,
    String? office,
    String? email,
    String? phone,
    bool? isTransportEligible,
    String? profilePhotoUrl,
    DateTime? createdAt,
  }) {
    return EmployeeUser(
      id: id ?? this.id,
      employeeId: employeeId ?? this.employeeId,
      fullName: fullName ?? this.fullName,
      organization: organization ?? this.organization,
      office: office ?? this.office,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      isTransportEligible: isTransportEligible ?? this.isTransportEligible,
      profilePhotoUrl: profilePhotoUrl ?? this.profilePhotoUrl,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
