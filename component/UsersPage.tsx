// app/users/page.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

interface Challan {
  id: string; timestamp: string; zone: string; fine_amount: number; status: string; penalty_details: string; vehicles?: { plate_number: string };
}
interface User {
  id: string; name: string; license_number: string; status: string; challans: Challan[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [license, setLicense] = useState('');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, UNPAID, CLEAR, LAPSED

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*, challans(*, vehicles(plate_number))').order('name', { ascending: true });
    if (!error && data) setUsers(data as User[]);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  // --- Actions ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading('Creating driver...');
    const { error } = await supabase.from('users').insert([
      {
        name,
        license_number: license.toUpperCase(),
      },
    ]);

    if (error) {
      toast.update(loadingToast, {
        render: error.message || 'Failed to create user',
        type: 'error',
        isLoading: false,
        closeButton: true
      });
      return;
    }
    toast.update(loadingToast, {
      render: 'Driver registered successfully',
      type: 'success',
      isLoading: false,
      autoClose: 3000
    });
    setName('');
    setLicense('');
    setIsCreateModalOpen(false);
    fetchUsers();
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading('Updating driver...');
    const { data, error } = await supabase.from('users').update([
      {
        name,
        license_number: license.toUpperCase(),
      },
    ]).eq('id', selectedUser?.id).select('*, challans(*)');

    if (error) {
      toast.update(loadingToast, {
        render: error.message || 'Failed to update user',
        type: 'error',
        isLoading: false,
        closeButton: true
      });
      return;
    }
    toast.update(loadingToast, {
      render: 'Driver updated successfully',
      type: 'success',
      isLoading: false,
      autoClose: 3000
    });
    setName('');
    setLicense('');
    setIsUpdateModalOpen(false);
    setSelectedUser(data[0]);
    fetchUsers();
  };

  const handlePayChallan = async (challanId: string) => {
    await supabase.from('challans').update({ status: 'PAID' }).eq('id', challanId);
    fetchUsers();
    if (selectedUser) {
      setSelectedUser({ ...selectedUser, challans: selectedUser.challans.map(c => c.id === challanId ? { ...c, status: 'PAID' } : c) });
    }
  };

  const handlePayAllUserChallans = async (userId: string) => {
    await supabase.from('challans').update({ status: 'PAID' }).eq('user_id', userId).eq('status', 'UNPAID');
    fetchUsers();
    if (selectedUser) {
      setSelectedUser({ ...selectedUser, challans: selectedUser.challans.map(c => ({ ...c, status: 'PAID' })) });
    }
  };

  // --- Filtering Logic ---
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.license_number.toLowerCase().includes(searchQuery.toLowerCase());
      const hasUnpaid = user.challans.some(c => c.status === 'UNPAID');

      if (statusFilter === 'UNPAID' && !hasUnpaid) return false;
      if (statusFilter === 'CLEAR' && hasUnpaid) return false;
      if (statusFilter === 'LAPSED' && user.status !== 'LAPSED') return false;

      return matchesSearch;
    });
  }, [users, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-[#1e1e2f] text-white p-10 relative">
      <Link href="/" className="text-gray-400 hover:text-white mb-6 inline-block">← Back to Dashboard</Link>

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Driver Database</h1>
          <p className="text-gray-400">Manage {users.length} registered drivers</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="bg-[#7bed9f] text-[#1e1e2f] px-6 py-2 rounded font-bold shadow-lg hover:opacity-90 transition-opacity">
          + Register New Driver
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#2a2a40] p-4 rounded-lg shadow-lg mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text" placeholder="Search by name or license..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 p-2 rounded bg-[#1e1e2f] border border-gray-600 outline-none focus:border-[#7bed9f]"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 rounded bg-[#1e1e2f] border border-gray-600 outline-none focus:border-[#7bed9f] md:w-48">
          <option value="ALL">All Drivers</option>
          <option value="UNPAID">Has Unpaid Fines</option>
          <option value="CLEAR">Clear Record</option>
          <option value="LAPSED">Lapsed License</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-[#2a2a40] rounded-lg shadow-lg overflow-x-auto">
        {loading ? <p className="p-6">Loading data...</p> : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 bg-[#33334d]">
                <th className="p-4">Driver Name</th>
                <th className="p-4">License #</th>
                <th className="p-4">License Status</th>
                <th className="p-4">Fine Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">No drivers found.</td></tr>
              ) : (
                filteredUsers.map(user => {
                  const unpaidCount = user.challans?.filter(c => c.status === 'UNPAID').length || 0;
                  return (
                    <tr key={user.id} className="border-b border-gray-700/50 hover:bg-[#33334d] transition-colors">
                      <td className="p-4 font-semibold">{user.name}</td>
                      <td className="p-4 font-mono text-sm">{user.license_number}</td>
                      <td className={`p-4 font-bold ${user.status === 'LAPSED' ? 'text-red-500' : 'text-green-400'}`}>{user.status}</td>
                      <td className="p-4">
                        {unpaidCount > 0 ? <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/30">{unpaidCount} Pending</span> : <span className="text-gray-500 text-sm">Clear</span>}
                      </td>
                      <td className="p-4">
                        <button onClick={() => setSelectedUser(user)} className="text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded transition-colors font-semibold">
                          View Records
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: Create User */}
      {isCreateModalOpen && (
        <div onClick={() => setIsCreateModalOpen(false)} className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-[#2a2a40] p-6 rounded-lg w-full max-w-md relative shadow-2xl border border-gray-700">
            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
            <h2 className="text-2xl font-bold mb-6">Register New Driver</h2>
            <form onSubmit={handleCreateUser}>
              <label className="block text-sm text-gray-400 mb-1">Driver Name</label>
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full p-2 mb-4 rounded bg-[#1e1e2f] border border-gray-600 outline-none focus:border-[#7bed9f]" />
              <label className="block text-sm text-gray-400 mb-1">License Number</label>
              <input required type="text" value={license} onChange={(e) => setLicense(e.target.value)}
                className="w-full p-2 mb-6 rounded bg-[#1e1e2f] border border-gray-600 outline-none uppercase focus:border-[#7bed9f]" />
              <button type="submit" className="w-full bg-[#7bed9f] text-[#1e1e2f] font-bold py-3 rounded hover:opacity-90 transition-opacity">Submit Registration</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Challan Details (Kept exactly the same as previous step, just ensure the formatting matches) */}
      {selectedUser && (
        <div onClick={() => setSelectedUser(null)} className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-[#2a2a40] p-6 rounded-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto relative shadow-2xl border border-gray-700">
            <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
            <div className='flex flex-row mb-6 gap-4'>
              <div>
                <h2 className="text-2xl font-bold mb-1">{selectedUser.name}'s Records</h2>
                <p className="text-gray-400">License: {selectedUser.license_number}</p>
              </div>
              <div>
                <button onClick={() => { setIsUpdateModalOpen(true); setName(selectedUser.name); setLicense(selectedUser.license_number); }} className='bg-yellow-500 hover:bg-amber-300 px-2 py-1 rounded mr-2' >edit</button>
              </div>
            </div>
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
              <h3 className="text-xl font-bold text-[#ffa502]">Challan History</h3>
              {selectedUser.challans.some(c => c.status === 'UNPAID') && (
                <button onClick={() => handlePayAllUserChallans(selectedUser.id)} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-bold shadow-lg">
                  Pay ALL Unpaid (₹{selectedUser.challans.filter(c => c.status === 'UNPAID').reduce((sum, c) => sum + c.fine_amount, 0)})
                </button>
              )}
            </div>
            {selectedUser.challans.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No violations on record.</p>
            ) : (
              <div className="space-y-3">
                {selectedUser.challans.map(challan => (
                  <div key={challan.id} className="bg-[#1e1e2f] p-4 rounded border border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <p className="font-mono text-xs text-gray-400 mb-1">{new Date(challan.timestamp).toLocaleString()}</p>
                      <p className="font-bold text-lg text-white">{challan.penalty_details}</p>
                      <p className="text-sm text-gray-400 mt-1">📍 {challan.zone} | Fine: ₹{challan.fine_amount} | Vehicle: <span className="text-[#ffa502] font-mono ml-1">{challan.vehicles?.plate_number || 'Unknown'}</span></p>
                    </div>
                    <div className="w-full sm:w-auto text-right">
                      {challan.status === 'PAID' ? (
                        <span className="inline-block bg-green-900/30 text-green-400 px-4 py-2 rounded font-bold border border-green-800">✓ PAID  ₹{challan.fine_amount}</span>
                      ) : (
                        <button onClick={() => handlePayChallan(challan.id)} className="w-full sm:w-auto bg-[#ff4757] hover:bg-red-500 px-6 py-2 rounded font-bold text-white shadow">
                          Pay ₹{challan.fine_amount}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isUpdateModalOpen && (
        <div onClick={() => { setIsUpdateModalOpen(false); setName(''); setLicense(''); }} className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-[#2a2a40] p-6 rounded-lg w-full max-w-md relative shadow-2xl border border-gray-700">
            <button onClick={() => { setIsUpdateModalOpen(false); setName(''); setLicense(''); }} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
            <h2 className="text-2xl font-bold mb-6">Update Driver Info</h2>
            <form onSubmit={handleUpdateUser}>
              <label className="block text-sm text-gray-400 mb-1">Driver Name</label>
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full p-2 mb-4 rounded bg-[#1e1e2f] border border-gray-600 outline-none focus:border-[#7bed9f]" />
              <label className="block text-sm text-gray-400 mb-1">License Number</label>
              <input required type="text" value={license} onChange={(e) => setLicense(e.target.value)}
                className="w-full p-2 mb-6 rounded bg-[#1e1e2f] border border-gray-600 outline-none uppercase focus:border-[#7bed9f]" />
              <button type="submit" className={`w-full bg-[#7bed9f] text-[#1e1e2f] font-bold py-3 rounded hover:opacity-90 transition-opacity ${name == selectedUser?.name && license == selectedUser.license_number ? 'cursor-not-allowed' : 'cursor-pointer'} `} disabled={name == selectedUser?.name && license == selectedUser.license_number} >Update</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}