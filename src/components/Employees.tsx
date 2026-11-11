import { getLocalISODate } from '../utils/date';
import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { Employee, UserRole } from '../types';

interface EmployeesProps {
  employees: Employee[];
  currencySymbol: string;
  hotelId: string;
  onAddEmployee: (emp: Omit<Employee, 'id'>) => Promise<void>;
  onUpdateAttendance: (empId: string, date: string, status: 'Present' | 'Absent' | 'Leave') => Promise<void>;
}

export default function Employees({
  employees,
  currencySymbol,
  hotelId,
  onAddEmployee,
  onUpdateAttendance
}: EmployeesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'attendance'>('roster');

  // Employee Form states
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empRole, setEmpRole] = useState<UserRole>('Receptionist');
  const [empSalary, setEmpSalary] = useState(1500);
  const [empDept, setEmpDept] = useState('Front Desk');

  // Attendance Date
  const [attendanceDate, setAttendanceDate] = useState(getLocalISODate());

  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim()) {
      alert('Please fill out required fields');
      return;
    }

    try {
      await onAddEmployee({
        name: empName,
        email: empEmail,
        phone: empPhone,
        role: empRole,
        salary: Number(empSalary),
        department: empDept,
        hotelId
      });
      alert('Employee successfully added!');
      setEmpName('');
      setEmpEmail('');
      setEmpPhone('');
    } catch (err) {
      console.error(err);
      alert('Failed to register employee');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('roster')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'roster'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Staff Profiles & Roster
        </button>
        <button
          onClick={() => {
            setActiveSubTab('attendance');
          }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'attendance'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Attendance Registrar
        </button>
      </div>

      {activeSubTab === 'roster' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Employee Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <span>Add Employee Record</span>
            </h3>
            <form onSubmit={handleAddEmployeeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Liam Foster"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Email *</label>
                  <input
                    type="email"
                    placeholder="liam@hotel.com"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 888 0122"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">ERP Role</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="Manager">Manager</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Housekeeping Staff">Housekeeping Staff</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Department</label>
                  <input
                    type="text"
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Monthly Salary ({currencySymbol})</label>
                <input
                  type="number"
                  value={empSalary}
                  onChange={(e) => setEmpSalary(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Employee</span>
              </button>
            </form>
          </div>

          {/* Employees List */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">Employees Roster</h3>
            <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {employees.map((emp) => (
                <div key={emp.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{emp.name}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {emp.role} • Dept: {emp.department} • Phone: {emp.phone || 'N/A'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly Salary</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">
                      {currencySymbol}
                      {emp.salary.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              {employees.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-12">No employees registered yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Attendance Registrar</h3>
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-slate-500">Record Date:</span>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="px-3 py-1 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
            {employees.map((emp) => {
              const status = emp.attendance?.[attendanceDate] || 'Absent';
              return (
                <div key={emp.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{emp.name}</h4>
                    <p className="text-[10px] text-slate-400">{emp.role}</p>
                  </div>

                  <div className="flex space-x-2">
                    {(['Present', 'Absent', 'Leave'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => onUpdateAttendance(emp.id, attendanceDate, st)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          status === st
                            ? st === 'Present'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : st === 'Absent'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-amber-50 text-amber-600 border border-amber-200'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {employees.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-12">No employee roster to record attendance for.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
