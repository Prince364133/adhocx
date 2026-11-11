export type RouteStatus = 'Active' | 'Inactive' | 'Planning';

export interface RouteStop {
  id: string;
  name: string;
}

export interface Route {
  id: string;
  code: string;
  name: string;
  source: string;
  destination: string;
  stops: RouteStop[];
  assignedEmployees: number;
  assignedVehicle: string;
  status: RouteStatus;
  createdAt: string;
}

export const MOCK_ROUTES: Route[] = [
  { id: 'route-001', code: 'HYD-001', name: 'Kondapur to HITEC City', source: 'Kondapur', destination: 'HITEC City', stops: [{ id: 's-001', name: 'Miyapur Metro' }, { id: 's-002', name: 'KPHB Colony' }, { id: 's-003', name: 'Kukatpally' }, { id: 's-004', name: 'Madhapur' }], assignedEmployees: 18, assignedVehicle: 'TS 09 UB 7845', status: 'Active', createdAt: '2025-02-14' },
  { id: 'route-002', code: 'HYD-002', name: 'Gachibowli Financial District', source: 'Gachibowli', destination: 'Financial District', stops: [{ id: 's-005', name: 'Nanakramguda' }, { id: 's-006', name: 'Wipro Circle' }], assignedEmployees: 12, assignedVehicle: 'TS 08 UK 2316', status: 'Active', createdAt: '2025-03-02' },
  { id: 'route-003', code: 'BLR-001', name: 'Whitefield Outer Ring Road', source: 'Whitefield', destination: 'Outer Ring Road', stops: [{ id: 's-007', name: 'ITPL Main Gate' }, { id: 's-008', name: 'Marathahalli Bridge' }, { id: 's-009', name: 'Bellandur' }], assignedEmployees: 21, assignedVehicle: 'KA 03 MN 9082', status: 'Planning', createdAt: '2025-04-10' },
  { id: 'route-004', code: 'BLR-002', name: 'Electronic City Koramangala', source: 'Electronic City', destination: 'Koramangala', stops: [{ id: 's-010', name: 'Bommanahalli' }, { id: 's-011', name: 'HSR Layout' }], assignedEmployees: 9, assignedVehicle: 'KA 51 AB 4482', status: 'Active', createdAt: '2025-05-21' },
  { id: 'route-005', code: 'MUM-001', name: 'Powai to Bandra Kurla Complex', source: 'Powai', destination: 'Bandra Kurla Complex', stops: [{ id: 's-012', name: 'Andheri East' }, { id: 's-013', name: 'Bandra Station' }], assignedEmployees: 14, assignedVehicle: 'MH 02 FG 1904', status: 'Active', createdAt: '2025-06-05' },
  { id: 'route-006', code: 'GGN-001', name: 'Sector 56 Cyber City', source: 'Sector 56, Gurugram', destination: 'Cyber City', stops: [{ id: 's-014', name: 'Golf Course Road' }, { id: 's-015', name: 'MG Road Metro' }, { id: 's-016', name: 'DLF Phase 2' }], assignedEmployees: 16, assignedVehicle: 'HR 55 AA 7318', status: 'Planning', createdAt: '2025-06-18' },
  { id: 'route-007', code: 'HYD-003', name: 'Uppal to Begumpet', source: 'Uppal', destination: 'Begumpet', stops: [{ id: 's-017', name: 'Tarnaka' }, { id: 's-018', name: 'Secunderabad Clock Tower' }], assignedEmployees: 0, assignedVehicle: 'TS 10 EA 6421', status: 'Inactive', createdAt: '2025-07-12' },
  { id: 'route-008', code: 'CCU-001', name: 'Salt Lake New Town Express', source: 'Salt Lake Sector I', destination: 'New Town', stops: [{ id: 's-019', name: 'Sector V' }, { id: 's-020', name: 'Nicco Park' }], assignedEmployees: 11, assignedVehicle: 'WB 06 K 3128', status: 'Active', createdAt: '2025-08-03' },
  { id: 'route-009', code: 'PUN-001', name: 'Hinjawadi to Baner', source: 'Hinjawadi Phase 1', destination: 'Baner', stops: [{ id: 's-021', name: 'Wakad Bridge' }, { id: 's-022', name: 'Balewadi High Street' }], assignedEmployees: 13, assignedVehicle: 'MH 12 QX 9034', status: 'Active', createdAt: '2025-08-22' },
  { id: 'route-010', code: 'CHE-001', name: 'OMR Sholinganallur Corridor', source: 'Thoraipakkam', destination: 'Sholinganallur', stops: [{ id: 's-023', name: 'Perungudi Toll' }, { id: 's-024', name: 'Kandanchavadi' }, { id: 's-025', name: 'Karapakkam' }], assignedEmployees: 17, assignedVehicle: 'TN 09 CD 5812', status: 'Planning', createdAt: '2025-09-11' },
  { id: 'route-011', code: 'HYD-004', name: 'LB Nagar to HiTech City', source: 'LB Nagar', destination: 'HITEC City', stops: [{ id: 's-026', name: 'Dilsukhnagar' }, { id: 's-027', name: 'Malakpet' }, { id: 's-028', name: 'Abids' }], assignedEmployees: 15, assignedVehicle: 'TS 07 UG 1920', status: 'Active', createdAt: '2025-10-04' },
  { id: 'route-012', code: 'BLR-003', name: 'Yelahanka to Manyata Tech Park', source: 'Yelahanka New Town', destination: 'Manyata Tech Park', stops: [{ id: 's-029', name: 'Hebbal Flyover' }, { id: 's-030', name: 'Nagawara' }], assignedEmployees: 10, assignedVehicle: 'KA 04 PQ 7621', status: 'Inactive', createdAt: '2025-10-19' },
];
