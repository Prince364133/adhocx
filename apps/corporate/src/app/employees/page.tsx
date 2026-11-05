'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  UserX,
  UploadCloud,
  Plus,
  Eye,
  Edit2,
  MoreVertical,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface EmployeeItem {
  id: string;
  code: string;
  name: string;
  avatarInitials: string;
  department: string;
  office: string;
  eligibility: 'Eligible' | 'Not Eligible';
  status: 'Active' | 'On Leave' | 'Inactive';
}

const MOCK_EMPLOYEES_LIST: EmployeeItem[] = [
  { id: '1', code: 'EMP02467', name: 'Priya Sharma', avatarInitials: 'PS', department: 'Product', office: 'HiTEC City', eligibility: 'Eligible', status: 'Active' },
  { id: '2', code: 'EMP01893', name: 'Amit Kumar', avatarInitials: 'AK', department: 'Engineering', office: 'Kondapur', eligibility: 'Eligible', status: 'Active' },
  { id: '3', code: 'EMP03124', name: 'Neha Verma', avatarInitials: 'NV', department: 'Design', office: 'Gachibowli', eligibility: 'Eligible', status: 'Active' },
  { id: '4', code: 'EMP02911', name: 'Rohit Singh', avatarInitials: 'RS', department: 'Operations', office: 'HiTEC City', eligibility: 'Not Eligible', status: 'Active' },
  { id: '5', code: 'EMP03376', name: 'Anjali Rao', avatarInitials: 'AR', department: 'HR', office: 'Madhapur', eligibility: 'Eligible', status: 'On Leave' },
  { id: '6', code: 'EMP04011', name: 'Vikram Reddy', avatarInitials: 'VR', department: 'Sales', office: 'HiTEC City', eligibility: 'Eligible', status: 'Active' },
  { id: '7', code: 'EMP04109', name: 'Sanya Mehta', avatarInitials: 'SM', department: 'Marketing', office: 'Gachibowli', eligibility: 'Eligible', status: 'Active' },
  { id: '8', code: 'EMP04250', name: 'Karthik Raja', avatarInitials: 'KR', department: 'Engineering', office: 'HiTEC City', eligibility: 'Eligible', status: 'Active' },
  { id: '9', code: 'EMP04312', name: 'Deepika Iyer', avatarInitials: 'DI', department: 'Finance', office: 'Kondapur', eligibility: 'Not Eligible', status: 'Inactive' },
  { id: '10', code: 'EMP04498', name: 'Suresh Babu', avatarInitials: 'SB', department: 'Operations', office: 'HiTEC City', eligibility: 'Eligible', status: 'Active' },
];

export default function EmployeeDirectoryPage() {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES_LIST);
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedEligibility, setSelectedEligibility] = useState('All Eligibility');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredEmployees = employees.filter((emp) => {
    const matchesOffice = selectedOffice === 'All Offices' || emp.office === selectedOffice;
    const matchesDept = selectedDept === 'All Departments' || emp.department === selectedDept;
    const matchesElig = selectedEligibility === 'All Eligibility' || emp.eligibility === selectedEligibility;
    const matchesStatus = selectedStatus === 'All Status' || emp.status === selectedStatus;
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesOffice && matchesDept && matchesElig && matchesStatus && matchesSearch;
  });

  const handleReset = () => {
    setSelectedOffice('All Offices');
    setSelectedDept('All Departments');
    setSelectedEligibility('All Eligibility');
    setSelectedStatus('All Status');
    setSearchQuery('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Buttons Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Employee Directory
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            View, search and manage all employees and their transport eligibility
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/employees/import"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#EFF6FF',
              color: '#5728B2',
              border: '1px solid #BFDBFE',
              borderRadius: 'var(--radius-md)',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <UploadCloud size={15} />
            <span>Import Employees</span>
          </Link>

          <button
            onClick={() => alert('Add Employee modal dialog')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#5728B2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(87, 40, 178,0.25)',
            }}
          >
            <Plus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="surface-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', backgroundColor: '#FFFFFF' }}>
        {/* Office select */}
        <select
          value={selectedOffice}
          onChange={(e) => setSelectedOffice(e.target.value)}
          style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600, color: '#475569', outline: 'none' }}
        >
          <option value="All Offices">All Offices</option>
          <option value="HiTEC City">HiTEC City</option>
          <option value="Kondapur">Kondapur</option>
          <option value="Gachibowli">Gachibowli</option>
          <option value="Madhapur">Madhapur</option>
        </select>

        {/* Department select */}
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600, color: '#475569', outline: 'none' }}
        >
          <option value="All Departments">All Departments</option>
          <option value="Product">Product</option>
          <option value="Engineering">Engineering</option>
          <option value="Design">Design</option>
          <option value="Operations">Operations</option>
          <option value="HR">HR</option>
          <option value="Sales">Sales</option>
          <option value="Marketing">Marketing</option>
        </select>

        {/* Eligibility select */}
        <select
          value={selectedEligibility}
          onChange={(e) => setSelectedEligibility(e.target.value)}
          style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600, color: '#475569', outline: 'none' }}
        >
          <option value="All Eligibility">All Eligibility</option>
          <option value="Eligible">Eligible</option>
          <option value="Not Eligible">Not Eligible</option>
        </select>

        {/* Status select */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600, color: '#475569', outline: 'none' }}
        >
          <option value="All Status">All Status</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Inactive">Inactive</option>
        </select>

        <button
          onClick={handleReset}
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 6,
            border: '1px solid #CBD5E1',
            backgroundColor: '#F8FAFC',
            color: '#64748B',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Reset
        </button>

        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 11 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID or department..."
            style={{
              width: '100%',
              height: 36,
              paddingLeft: 32,
              paddingRight: 10,
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              fontSize: 12,
              outline: 'none',
              backgroundColor: '#F8FAFC',
            }}
          />
        </div>
      </div>

      {/* Metric Strip */}
      <div
        className="surface-card"
        style={{
          padding: '14px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '14px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>2,846</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total Employees</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>2,568</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Transport Eligible</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>198</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Not Eligible</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>24</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>On Leave</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserX size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>56</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Inactive</div>
          </div>
        </div>
      </div>

      {/* Employee Data Table */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" />
                </th>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Office</th>
                <th>Eligibility</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <input type="checkbox" />
                  </td>
                  <td style={{ fontWeight: 700, color: '#0F172A' }}>{emp.code}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: '#1E293B',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {emp.avatarInitials}
                      </div>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{emp.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: '#475569' }}>{emp.department}</td>
                  <td style={{ fontSize: '12px', color: '#475569' }}>{emp.office}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: emp.eligibility === 'Eligible' ? '#DCFCE7' : '#FEF3C7',
                        color: emp.eligibility === 'Eligible' ? '#16A34A' : '#D97706',
                        border: `1px solid ${emp.eligibility === 'Eligible' ? '#86EFAC' : '#FCD34D'}`,
                      }}
                    >
                      {emp.eligibility}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor:
                          emp.status === 'Active'
                            ? '#DCFCE7'
                            : emp.status === 'On Leave'
                            ? '#F3E8FF'
                            : '#F1F5F9',
                        color:
                          emp.status === 'Active'
                            ? '#16A34A'
                            : emp.status === 'On Leave'
                            ? '#7C3AED'
                            : '#64748B',
                      }}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <Link
                        href={`/employees/profile?id=${emp.id}`}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#EFF6FF',
                          color: '#5728B2',
                          border: '1px solid #BFDBFE',
                        }}
                        title="View Profile"
                      >
                        <Eye size={13} />
                      </Link>
                      <button
                        onClick={() => alert(`Edit ${emp.name}`)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#F8FAFC',
                          color: '#475569',
                          border: '1px solid #CBD5E1',
                          cursor: 'pointer',
                        }}
                        title="Edit Details"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => alert(`Options for ${emp.name}`)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#F8FAFC',
                          color: '#475569',
                          border: '1px solid #CBD5E1',
                          cursor: 'pointer',
                        }}
                      >
                        <MoreVertical size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            Showing 1 - 10 of 2,846 employees
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              disabled={currentPage === 1}
              style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <ChevronLeft size={14} color="#64748B" />
            </button>
            <button style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #5728B2', backgroundColor: '#5728B2', color: '#FFFFFF', fontSize: 12, fontWeight: 700 }}>
              1
            </button>
            <button style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: 12, fontWeight: 600 }}>
              2
            </button>
            <button style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: 12, fontWeight: 600 }}>
              3
            </button>
            <button style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: 12, fontWeight: 600 }}>
              4
            </button>
            <button style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: 12, fontWeight: 600 }}>
              5
            </button>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>...</span>
            <button style={{ width: 34, height: 28, borderRadius: 4, border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: 12, fontWeight: 600 }}>
              285
            </button>
            <button style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight size={14} color="#64748B" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

