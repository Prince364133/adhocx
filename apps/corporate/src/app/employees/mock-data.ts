export type EmploymentStatus = 'Active' | 'Inactive';

export interface EmployeeRecord {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  office: string;
  status: EmploymentStatus;
}

export const MOCK_EMPLOYEES: EmployeeRecord[] = [
  { id: 'emp-001', employeeId: 'ADX-1001', fullName: 'Ananya Rao', email: 'ananya.rao@hitec.example', phone: '+91 98480 23104', department: 'Engineering', designation: 'Engineering Manager', office: 'Hyderabad', status: 'Active' },
  { id: 'emp-002', employeeId: 'ADX-1002', fullName: 'Arjun Mehta', email: 'arjun.mehta@hitec.example', phone: '+91 98765 41230', department: 'Product', designation: 'Senior Product Designer', office: 'Bengaluru', status: 'Active' },
  { id: 'emp-003', employeeId: 'ADX-1003', fullName: 'Diya Nair', email: 'diya.nair@hitec.example', phone: '+91 99860 34512', department: 'People & Culture', designation: 'People Operations Lead', office: 'Bengaluru', status: 'Active' },
  { id: 'emp-004', employeeId: 'ADX-1004', fullName: 'Kabir Shah', email: 'kabir.shah@hitec.example', phone: '+91 98100 78214', department: 'Finance', designation: 'Financial Analyst', office: 'Gurugram', status: 'Inactive' },
  { id: 'emp-005', employeeId: 'ADX-1005', fullName: 'Meera Iyer', email: 'meera.iyer@hitec.example', phone: '+91 98491 56780', department: 'Engineering', designation: 'Software Engineer', office: 'Hyderabad', status: 'Active' },
  { id: 'emp-006', employeeId: 'ADX-1006', fullName: 'Neel Kapoor', email: 'neel.kapoor@hitec.example', phone: '+91 98990 12345', department: 'Operations', designation: 'Operations Specialist', office: 'Gurugram', status: 'Active' },
  { id: 'emp-007', employeeId: 'ADX-1007', fullName: 'Ishita Sen', email: 'ishita.sen@hitec.example', phone: '+91 98300 45671', department: 'Marketing', designation: 'Brand Marketing Manager', office: 'Kolkata', status: 'Active' },
  { id: 'emp-008', employeeId: 'ADX-1008', fullName: 'Rohan Desai', email: 'rohan.desai@hitec.example', phone: '+91 98201 77342', department: 'Product', designation: 'Product Manager', office: 'Mumbai', status: 'Inactive' },
  { id: 'emp-009', employeeId: 'ADX-1009', fullName: 'Tara Reddy', email: 'tara.reddy@hitec.example', phone: '+91 98490 34126', department: 'Engineering', designation: 'QA Engineer', office: 'Hyderabad', status: 'Active' },
  { id: 'emp-010', employeeId: 'ADX-1010', fullName: 'Vivaan Khanna', email: 'vivaan.khanna@hitec.example', phone: '+91 98111 90876', department: 'Finance', designation: 'Accounts Associate', office: 'Gurugram', status: 'Active' },
  { id: 'emp-011', employeeId: 'ADX-1011', fullName: 'Sara Fernandes', email: 'sara.fernandes@hitec.example', phone: '+91 98220 61743', department: 'People & Culture', designation: 'Talent Acquisition Partner', office: 'Mumbai', status: 'Active' },
  { id: 'emp-012', employeeId: 'ADX-1012', fullName: 'Dev Malhotra', email: 'dev.malhotra@hitec.example', phone: '+91 98730 55219', department: 'Operations', designation: 'Workplace Coordinator', office: 'Bengaluru', status: 'Active' },
];

export const DEPARTMENTS = [
  'Engineering',
  'Finance',
  'Marketing',
  'Operations',
  'People & Culture',
  'Product',
];

export const OFFICES = ['Bengaluru', 'Gurugram', 'Hyderabad', 'Kolkata', 'Mumbai'];
