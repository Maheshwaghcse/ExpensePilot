import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Users as UsersIcon, 
  Briefcase, 
  Mail, 
  Shield, 
  Trash2, 
  Loader2, 
  X,
  CheckCircle2,
  Edit3
} from 'lucide-react';

const Users = () => {
  const { user } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'departments'

  // Data lists
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Invite Employee Form
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'Employee',
    departmentId: '',
    password: ''
  });
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Edit Employee Form
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    role: 'Employee',
    departmentId: '',
    status: 'Active'
  });
  const [updatingUser, setUpdatingUser] = useState(false);

  // Department Form
  const [deptForm, setDeptForm] = useState({
    name: '',
    managerId: ''
  });
  const [creatingDept, setCreatingDept] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/users');
      setEmployees(res.data.users);
    } catch (err) {
      console.error('Failed to load employees:', err.message);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to load departments:', err.message);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchEmployees(), fetchDepartments()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteSuccess('');
    try {
      const res = await api.post('/users/invite', inviteForm);
      const assignedPass = res.data.passwordAssigned;
      setInviteSuccess(`User ${inviteForm.name} created successfully! Password assigned: "${assignedPass}".`);
      setInviteForm({ name: '', email: '', role: 'Employee', departmentId: '', password: '' });
      fetchEmployees();
      setTimeout(() => {
        setInviteModalOpen(false);
        setInviteSuccess('');
      }, 4500);
    } catch (err) {
      alert(err.response?.data?.error || 'Invitation failed');
    } finally {
      setInviting(false);
    }
  };

  const handleOpenEditUser = (emp) => {
    setEditingUser(emp);
    setEditUserForm({
      name: emp.name || '',
      role: emp.role || 'Employee',
      departmentId: emp.departmentId?._id || emp.departmentId || '',
      status: emp.status || 'Active'
    });
    setEditUserModalOpen(true);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setUpdatingUser(true);
    try {
      await api.put(`/users/${editingUser._id}`, editUserForm);
      setEditUserModalOpen(false);
      setEditingUser(null);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update employee details');
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    setCreatingDept(true);
    try {
      await api.post('/departments', deptForm);
      setDeptModalOpen(false);
      setDeptForm({ name: '', managerId: '' });
      fetchDepartments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create department');
    } finally {
      setCreatingDept(false);
    }
  };

  const handleDeleteDept = async (id) => {
    if (!window.confirm('Delete this department? Active employees will be unassigned.')) return;
    try {
      await api.delete(`/departments/${id}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="flex gap-4 border-b border-white/5 pb-2">
        <button 
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'employees' 
              ? 'border-indigo-500 text-white' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <UsersIcon className="w-4 h-4" /> Employees
        </button>
        
        <button 
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'departments' 
              ? 'border-indigo-500 text-white' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Departments
        </button>
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : activeTab === 'employees' ? (
        // Employees Tab
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Onboard members, assign permissions, and structure teams.</p>
            <button 
              onClick={() => setInviteModalOpen(true)}
              className="btn-gradient px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Invite Employee
            </button>
          </div>

          <div className="glass-card rounded-2xl border border-white/5 bg-slate-900/40 overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/20 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Department</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-medium text-slate-300">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">{emp.name}</td>
                    <td className="py-4 px-6 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{emp.email}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-indigo-400" />
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">{emp.departmentId?.name || 'Unassigned'}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleOpenEditUser(emp)}
                        className="px-3 py-1.5 rounded-lg border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 transition-all font-semibold flex items-center gap-1 ml-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Departments Tab
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Manage internal operational hierarchies and department heads.</p>
            <button 
              onClick={() => setDeptModalOpen(true)}
              className="btn-gradient px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <div key={dept._id} className="glass-card rounded-2xl p-5 border border-white/5 bg-slate-900/40 shadow-xl flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{dept.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    Manager: {dept.managerId ? dept.managerId.name : 'Unassigned'}
                  </p>
                </div>
                <button 
                  onClick={() => handleDeleteDept(dept._id)}
                  className="p-2 rounded-xl border border-rose-500/10 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/25 transition-all"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 border border-white/10 bg-slate-900 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white">Invite New Employee</h3>
              <button onClick={() => setInviteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="Jane Smith"
                  className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="jane@company.com"
                  className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Set Password (Choose password for HR / Employee)</label>
                <input 
                  type="text" 
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  placeholder="Enter password (or leave blank to auto-generate)"
                  className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-white focus:outline-none placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Role Permission</label>
                  <select 
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-white font-semibold focus:outline-none"
                  >
                    <option value="Employee">Employee</option>
                    <option value="HR Manager">HR Manager</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-slate-400 mb-1">Department</label>
                  <select 
                    value={inviteForm.departmentId}
                    onChange={(e) => setInviteForm({ ...inviteForm, departmentId: e.target.value })}
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-white font-semibold focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {inviteSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-[10px] font-bold text-emerald-400 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{inviteSuccess}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={inviting}
                className="btn-gradient w-full py-3 rounded-xl font-bold flex items-center justify-center mt-4"
              >
                {inviting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Invite'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 border border-white/10 bg-slate-900 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white">Create Department</h3>
              <button onClick={() => setDeptModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateDept} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-400 mb-1">Department Name</label>
                <input 
                  type="text" 
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Sales, Engineering"
                  className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assign Manager</label>
                <select 
                  value={deptForm.managerId}
                  onChange={(e) => setDeptForm({ ...deptForm, managerId: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-white font-semibold focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                disabled={creatingDept}
                className="btn-gradient w-full py-3 rounded-xl font-bold flex items-center justify-center mt-4"
              >
                {creatingDept ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Department'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 border border-white/10 bg-slate-900 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white">Edit Employee Details</h3>
              <button onClick={() => setEditUserModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditUserSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email (Read Only)</label>
                <input 
                  type="email" 
                  disabled
                  value={editingUser.email}
                  className="w-full rounded-xl bg-slate-950/50 border border-white/5 px-4 py-2.5 text-slate-400 focus:outline-none cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Role Permission</label>
                  <select 
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-white font-semibold focus:outline-none"
                  >
                    <option value="Employee">Employee</option>
                    <option value="HR Manager">HR Manager</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Company Admin">Company Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-slate-400 mb-1">Department</label>
                  <select 
                    value={editUserForm.departmentId}
                    onChange={(e) => setEditUserForm({ ...editUserForm, departmentId: e.target.value })}
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-white font-semibold focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Account Status</label>
                <select 
                  value={editUserForm.status}
                  onChange={(e) => setEditUserForm({ ...editUserForm, status: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-white font-semibold focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={updatingUser}
                className="btn-gradient w-full py-3 rounded-xl font-bold flex items-center justify-center mt-4"
              >
                {updatingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Employee Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
