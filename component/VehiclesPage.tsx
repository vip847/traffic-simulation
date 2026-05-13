// app/vehicles/page.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

interface Challan {
  id: string; timestamp: string; zone: string; fine_amount: number; status: string; penalty_details: string; users?: { name: string; license_number: string; };
}
interface Vehicle {
  id: string; plate_number: string; challans: Challan[];
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Form State
  const [plate, setPlate] = useState('');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, UNPAID, CLEAR

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('vehicles').select('*, challans(*, users(name, license_number))').order('plate_number', { ascending: true });
    if (!error && data) setVehicles(data as Vehicle[]);
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, []);

  // --- Actions ---
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    const loadingToast = toast.loading('Creating vehicle...');

    const { error } = await supabase.from('vehicles').insert([
      {
        plate_number: plate.toUpperCase(),
      },
    ]);

    if (error) {
      toast.update(loadingToast, {
        render: error.message || 'Failed to create vehicle',
        type: 'error',
        isLoading: false,
        closeButton: true
      });

      return;
    }

    toast.update(loadingToast, {
      render: 'Vehicle created successfully',
      type: 'success',
      isLoading: false,
      autoClose: 3000
    });

    setPlate('');
    setIsCreateModalOpen(false);

    fetchVehicles();
  };

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    const loadingToast = toast.loading('Updating vehicle...');

    const { data, error } = await supabase.from('vehicles').update([
      {
        plate_number: plate.toUpperCase(),
      },
    ]).eq('id', selectedVehicle?.id).select('*, challans(*)');

    if (error) {
      toast.update(loadingToast, {
        render: error.message || 'Failed to update vehicle',
        type: 'error',
        isLoading: false,
        closeButton: true
      });

      return;
    }

    toast.update(loadingToast, {
      render: 'Vehicle updated successfully',
      type: 'success',
      isLoading: false,
      autoClose: 3000
    });

    setPlate('');
    setIsUpdateModalOpen(false);
    setSelectedVehicle(data[0]);
    fetchVehicles();
  };

  const handlePayChallan = async (challanId: string) => {
    await supabase.from('challans').update({ status: 'PAID' }).eq('id', challanId);
    fetchVehicles();
    if (selectedVehicle) {
      setSelectedVehicle({ ...selectedVehicle, challans: selectedVehicle.challans.map(c => c.id === challanId ? { ...c, status: 'PAID' } : c) });
    }
  };

  const handlePayAllVehicleChallans = async (vehicleId: string) => {
    await supabase.from('challans').update({ status: 'PAID' }).eq('vehicle_id', vehicleId).eq('status', 'UNPAID');
    fetchVehicles();
    if (selectedVehicle) {
      setSelectedVehicle({ ...selectedVehicle, challans: selectedVehicle.challans.map(c => ({ ...c, status: 'PAID' })) });
    }
  };

  // --- Filtering Logic ---
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      const matchesSearch = vehicle.plate_number.toLowerCase().includes(searchQuery.toLowerCase());
      const hasUnpaid = vehicle.challans.some(c => c.status === 'UNPAID');

      if (statusFilter === 'UNPAID' && !hasUnpaid) return false;
      if (statusFilter === 'CLEAR' && hasUnpaid) return false;

      return matchesSearch;
    });
  }, [vehicles, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-[#1e1e2f] text-white p-10 relative">
      <Link href="/" className="text-gray-400 hover:text-white mb-6 inline-block">← Back to Dashboard</Link>

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Vehicle Database</h1>
          <p className="text-gray-400">Track {vehicles.length} monitored vehicles</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="bg-[#ffa502] text-[#1e1e2f] px-6 py-2 rounded font-bold shadow-lg hover:opacity-90 transition-opacity">
          + Register New Vehicle
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#2a2a40] p-4 rounded-lg shadow-lg mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text" placeholder="Search by Plate Number (e.g. MH-31)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 p-2 rounded bg-[#1e1e2f] border border-gray-600 outline-none focus:border-[#ffa502]"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 rounded bg-[#1e1e2f] border border-gray-600 outline-none focus:border-[#ffa502] md:w-48">
          <option value="ALL">All Vehicles</option>
          <option value="UNPAID">Has Unpaid Fines</option>
          <option value="CLEAR">Clear Record</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-[#2a2a40] rounded-lg shadow-lg overflow-x-auto">
        {loading ? <p className="p-6">Loading data...</p> : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 bg-[#33334d]">
                <th className="p-4">Plate Number</th>
                <th className="p-4">Total Offenses</th>
                <th className="p-4">Fine Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500">No vehicles found.</td></tr>
              ) : (
                filteredVehicles.map(vehicle => {
                  const unpaidCount = vehicle.challans?.filter(c => c.status === 'UNPAID').length || 0;
                  return (
                    <tr key={vehicle.id} className="border-b border-gray-700/50 hover:bg-[#33334d] transition-colors">
                      <td className="p-4 font-mono text-lg text-[#ffa502] font-bold">{vehicle.plate_number}</td>
                      <td className="p-4 text-gray-300">{vehicle.challans?.length || 0} Recorded</td>
                      <td className="p-4">
                        {unpaidCount > 0 ? <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/30">{unpaidCount} Pending</span> : <span className="text-gray-500 text-sm">Clear</span>}
                      </td>
                      <td className="p-4">
                        <button onClick={() => setSelectedVehicle(vehicle)} className="text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded transition-colors font-semibold">
                          View Log
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

      {/* MODAL: Create Vehicle */}
      {isCreateModalOpen && (
        <div onClick={() => setIsCreateModalOpen(false)} className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-[#2a2a40] p-6 rounded-lg w-full max-w-md relative shadow-2xl border border-gray-700">
            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
            <h2 className="text-2xl font-bold mb-6">Register New Vehicle</h2>
            <form onSubmit={handleCreateVehicle}>
              <label className="block text-sm text-gray-400 mb-1">License Plate Number (e.g. MH-31-AB-1234)</label>
              <input required type="text" placeholder="e.g. MH-31-AB-1234" value={plate} onChange={(e) => setPlate(e.target.value)}
                className="w-full p-2 mb-6 rounded bg-[#1e1e2f] border border-gray-600 outline-none uppercase focus:border-[#ffa502]" />
              <button type="submit" className="w-full bg-[#ffa502] text-[#1e1e2f] font-bold py-3 rounded hover:opacity-90 transition-opacity">Submit Registration</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Challan Details */}
      {selectedVehicle && (
        <div onClick={() => setSelectedVehicle(null)} className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-[#2a2a40] p-6 rounded-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto relative shadow-2xl border border-gray-700">
            <button onClick={() => setSelectedVehicle(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
            <div className='flex flex-row mb-6 gap-4'>
              <div>
                <h2 className="text-2xl font-bold mb-1">Vehicle: {selectedVehicle.plate_number}</h2>
                <p className="text-gray-400">Challans attached to this vehicle frame.</p>
              </div>
              <div>
                <button onClick={() => { setIsUpdateModalOpen(true); setPlate(selectedVehicle.plate_number); }} className='bg-yellow-500 hover:bg-amber-300 px-2 py-1 rounded mr-2' >edit</button>
              </div>
            </div>
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
              <h3 className="text-xl font-bold text-[#ff4757]">Violation History</h3>
              {selectedVehicle.challans.some(c => c.status === 'UNPAID') && (
                <button onClick={() => handlePayAllVehicleChallans(selectedVehicle.id)} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-bold shadow-lg">
                  Pay ALL Unpaid (₹{selectedVehicle.challans.filter(c => c.status === 'UNPAID').reduce((sum, c) => sum + c.fine_amount, 0)})
                </button>
              )}
            </div>
            {selectedVehicle.challans.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No violations recorded for this vehicle.</p>
            ) : (
              <div className="space-y-3">
                {selectedVehicle.challans.map(challan => (
                  <div key={challan.id} className="bg-[#1e1e2f] p-4 rounded border border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <p className="font-mono text-xs text-gray-400 mb-1">{new Date(challan.timestamp).toLocaleString()}</p>
                      <p className="font-bold text-lg text-white">Name: <span className="text-[#ffa502] font-mono ml-1">{challan.users?.name}</span> | License Number: <span className="text-[#ffa502] font-mono ml-1">{challan.users?.license_number || 'Unknown'}</span></p>
                      <p className="text-sm text-gray-400 mt-1">📍 {challan.zone} | Penalty: <span className="text-[#ffa502] font-mono ml-1">{challan.penalty_details}</span></p>
                    </div>
                    <div className="w-full sm:w-auto text-right">
                      {challan.status === 'PAID' ? (
                        <span className="inline-block bg-green-900/30 text-green-400 px-4 py-2 rounded font-bold border border-green-800">✓ PAID ₹{challan.fine_amount}</span>
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

      {/* MODAL: Update Vehicle */}
      {isUpdateModalOpen && (
        <div onClick={() => { setIsUpdateModalOpen(false); setPlate(''); }} className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-[#2a2a40] p-6 rounded-lg w-full max-w-md relative shadow-2xl border border-gray-700">
            <button onClick={() => { setIsUpdateModalOpen(false); setPlate(''); }} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
            <h2 className="text-2xl font-bold mb-6">Update Vehicle</h2>
            <form onSubmit={handleUpdateVehicle}>
              <label className="block text-sm text-gray-400 mb-1">License Plate Number</label>
              <input required type="text" placeholder="e.g. MH-31-AB-1234" value={plate} onChange={(e) => setPlate(e.target.value)}
                className="w-full p-2 mb-6 rounded bg-[#1e1e2f] border border-gray-600 outline-none uppercase focus:border-[#ffa502]" />
              <button type="submit" className={`w-full bg-[#ffa502] text-[#1e1e2f] font-bold py-3 rounded hover:opacity-90 transition-opacity ${plate == selectedVehicle?.plate_number ? 'cursor-not-allowed' : 'cursor-pointer'} `} disabled={plate == selectedVehicle?.plate_number} >Update</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}