// app/simulation/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

interface Car {
  id: string; plate: string; driver: string; x: number; y: number; speed: number;
  isViolator: boolean; hasPendingChallans: boolean; color: string; flagged: boolean; fined: boolean; opacity: number;
}

interface LogEntry {
  id: number; time: string; msg: string; type: 'SYSTEM' | 'WARNING' | 'VIOLATION';
}

export default function TrafficSimulation() {
  // UI & Simulation State
  const [isRedLight, setIsRedLight] = useState(true);
  const [isAutoSpawn, setIsAutoSpawn] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Mobile Logs Drawer State
  const [isLogsMobileOpen, setIsLogsMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Modal & Setup State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [dbVehicles, setDbVehicles] = useState<any[]>([]);
  const [numPairs, setNumPairs] = useState<number>(1);
  const [tableRows, setTableRows] = useState<{ userId: string, vehicleId: string, willViolate: string }[]>([{ userId: '', vehicleId: '', willViolate: '' }]);

  // Refs for Canvas Animation (prevents heavy React re-renders)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const carsRef = useRef<Car[]>([]);
  const isRedLightRef = useRef(true);
  const isAutoSpawnRef = useRef(false);
  const isLogsMobileOpenRef = useRef(false); // Ref for tracking state inside intervals

  // --- Logger Utility with Notification Logic ---
  const addLog = (msg: string, type: 'SYSTEM' | 'WARNING' | 'VIOLATION') => {
    setLogs(prev => [{ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 50));

    // Only increment unread count if the mobile drawer is closed
    if (!isLogsMobileOpenRef.current) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const openLogs = () => {
    setIsLogsMobileOpen(true);
    isLogsMobileOpenRef.current = true;
    setUnreadCount(0); // Reset notifications when opened
  };

  const closeLogs = () => {
    setIsLogsMobileOpen(false);
    isLogsMobileOpenRef.current = false;
  };

  // --- Fetch DB Records ---
  useEffect(() => {
    const fetchDB = async () => {
      const { data: uData } = await supabase.from('users').select('*');
      const { data: vData } = await supabase.from('vehicles').select('*');
      if (uData) setDbUsers(uData);
      if (vData) setDbVehicles(vData);
    };
    fetchDB();
  }, []);

  // Sync Table Rows with manual spawn input
  useEffect(() => {
    setTableRows(prev => {
      const newRows = [...prev];
      while (newRows.length < numPairs) newRows.push({ userId: '', vehicleId: '', willViolate: '' });
      return newRows.slice(0, numPairs);
    });
  }, [numPairs]);

  // --- Spawn Logic (Manual & Auto) ---
  const triggerSpawn = async (pairsToSpawn: number, tableData: any[] = []) => {
    try {
      const loadingToast = toast.loading('Spawning vehicles...');
      const res = await fetch('/api/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numPairs: pairsToSpawn, table: tableData })
      });

      const data = await res.json();
      if (!data.success) {
        if (!isAutoSpawnRef.current) {
          setIsModalOpen(true);
          toast.update(loadingToast, {
            render: "Error spawning: " + data.error,
            type: 'error',
            isLoading: false,
            closeButton: true
          });
        }
        return;
      }

      toast.update(loadingToast, {
        render: 'Drivers are spawning successfully',
        type: 'success',
        isLoading: false,
        autoClose: 3000
      });

      data.pairs.forEach((pair: any, index: number) => {
        setTimeout(() => {
          const isBlocked = pair.user.status === 'LAPSED';
          carsRef.current.push({
            id: Math.random().toString(),
            plate: pair.vehicle.plate_number,
            driver: pair.user.name,
            x: 180,
            y: 650,
            speed: isBlocked ? 0 : 2.5, // Standard speed
            isViolator: pair.willViolate,
            hasPendingChallans: pair.hasPendingChallans,
            color: pair.willViolate ? '#ffa502' : '#7bed9f',
            flagged: false,
            fined: false,
            opacity: 1.0
          });
          if (pair.hasPendingChallans)
            toast.error(`The Driver ${pair.user.name} with Vehicle Number ${pair.vehicle.plate_number} has pending challan.`, { autoClose: false });
        }, index * 1000); // Stagger spawns to prevent overlay
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualSpawn = () => {
    setIsModalOpen(false);
    triggerSpawn(numPairs, tableRows);
    addLog(`System commanded manual spawn of ${numPairs} vehicles.`, 'SYSTEM');
  };

  // --- Auto Spawn Background Loop ---
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const spawnLoop = async () => {
      if (isAutoSpawnRef.current) {
        await triggerSpawn(1, []); // Spawn 1 completely random car
      }
      // Random wait between 1.5 to 3.5 seconds before spawning next car
      timeoutId = setTimeout(spawnLoop, Math.random() * 2000 + 1500);
    };
    spawnLoop();
    return () => clearTimeout(timeoutId);
  }, []);

  const toggleAutoSpawn = () => {
    const newState = !isAutoSpawn;
    setIsAutoSpawn(newState);
    isAutoSpawnRef.current = newState;
    addLog(newState ? 'Continuous Traffic Flow ACTIVATED.' : 'Continuous Traffic Flow DEACTIVATED.', 'SYSTEM');
  };

  const toggleLight = () => {
    const newState = !isRedLight;
    setIsRedLight(newState);
    isRedLightRef.current = newState;
    addLog(newState ? 'Traffic Light switched to RED. Tracking Active.' : 'Traffic Light switched to GREEN. Queue clearing.', 'SYSTEM');
  };

  // --- Penalty API Integration ---
  const reportViolationToDB = async (car: Car) => {
    try {
      const res = await fetch('/api/violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plateNumber: car.plate, driverName: car.driver, zone: 'ZONE_B_INTERSECTION' })
      });
      const data = await res.json();

      if (res.status === 403 && data.alert === 'CRITICAL_ARREST') {
        addLog(`OVERRIDE: ${data.message}`, 'VIOLATION');
      } else if (res.ok) {
        addLog(`Offense #${data.dispatch.offenseNumber} | ${car.driver} | ${data.dispatch.penaltyApplied}`, 'VIOLATION');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Canvas Animation Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;

    addLog('System Booted. Active V2I Tracking Online.', 'SYSTEM');

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#444'; ctx.fillRect(100, 0, 200, 600);

      ctx.strokeStyle = '#fff';
      ctx.setLineDash([15, 15]);
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(200, 0); ctx.lineTo(200, 600); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255, 165, 2, 0.2)'; ctx.fillRect(100, 280, 200, 40);
      ctx.fillStyle = '#ffa502'; ctx.font = '12px Arial'; ctx.fillText('ZONE A (Stop Line)', 105, 295);

      ctx.fillStyle = 'rgba(255, 71, 87, 0.2)'; ctx.fillRect(100, 150, 200, 60);
      ctx.fillStyle = '#ff4757'; ctx.fillText('ZONE B (Trap)', 105, 165);

      ctx.fillStyle = '#fff'; ctx.fillRect(100, 300, 200, 8);

      ctx.fillStyle = '#222'; ctx.fillRect(320, 250, 40, 100);
      ctx.beginPath(); ctx.arc(340, 275, 12, 0, Math.PI * 2);
      ctx.fillStyle = isRedLightRef.current ? '#ff4757' : '#555'; ctx.fill();
      ctx.beginPath(); ctx.arc(340, 325, 12, 0, Math.PI * 2);
      ctx.fillStyle = !isRedLightRef.current ? '#2ed573' : '#555'; ctx.fill();

      const cars = carsRef.current;

      for (let i = 0; i < cars.length; i++) {
        let car = cars[i];
        let shouldStop = false;

        if (car.hasPendingChallans) {
          ctx.fillStyle = `rgba(255, 71, 87, ${car.opacity})`; ctx.fillRect(car.x - 30, car.y - 30, 100, 20);
          ctx.fillStyle = `rgba(255, 255, 255, ${car.opacity})`; ctx.font = '10px Arial'; ctx.fillText(`BLOCKED`, car.x - 5, car.y - 15);
          car.opacity -= 0.005;
          shouldStop = true;
        } else {
          let closestCarAheadDist = Infinity;
          for (let j = 0; j < cars.length; j++) {
            if (i !== j && cars[j].y < car.y) {
              let dist = car.y - (cars[j].y + 70);
              if (dist > 0 && dist < closestCarAheadDist) closestCarAheadDist = dist;
            }
          }
          if (closestCarAheadDist < 15) shouldStop = true;
          if (isRedLightRef.current && !car.isViolator && car.y <= 340 && car.y > 300) shouldStop = true;
          if (!shouldStop) car.y -= car.speed;
        }

        if (isRedLightRef.current) {
          if (car.y < 320 && car.y > 280 && !car.flagged) {
            car.flagged = true;
            addLog(`Vehicle ${car.plate} approaching stop line at high speed. ${car.driver} is driving the vehicle.`, 'WARNING');
          }
          if (car.y < 210 && car.y > 150 && car.flagged && !car.fined) {
            car.fined = true;
            addLog(`CRITICAL: ${car.plate} crossed intersection! ${car.driver} is driving the vehicle!`, 'VIOLATION');
            reportViolationToDB(car);
          }
        }

        ctx.globalAlpha = Math.max(0, car.opacity);
        ctx.fillStyle = car.color; ctx.fillRect(car.x, car.y, 40, 70);
        ctx.fillStyle = '#000'; ctx.font = '10px Arial';
        ctx.fillText(car.driver, car.x + 2, car.y + 35);
        ctx.fillText(car.plate.split('-')[2] + car.plate.split('-')[3], car.x + 2, car.y + 50);
        ctx.globalAlpha = 1.0;
      }

      carsRef.current = cars.filter(car => car.y > -100 && car.opacity > 0);
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-[#1e1e2f] text-white overflow-hidden relative">

      {/* FLOATING ACTION BUTTON FOR MOBILE LOGS */}
      <button
        onClick={openLogs}
        className="lg:hidden fixed bottom-6 right-6 bg-[#2a2a40] border border-gray-600 shadow-[0_4px_20px_rgba(0,0,0,0.8)] text-white px-5 py-3 rounded-full z-30 flex items-center gap-2 font-bold hover:bg-[#33334d] transition-transform active:scale-95"
      >
        📋 Logs
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full animate-bounce shadow-lg ring-2 ring-[#1e1e2f]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* MOBILE BACKDROP FOR LOGS */}
      {isLogsMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-40 transition-opacity" onClick={closeLogs} />
      )}

      {/* LEFT CANVAS PANEL */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 px-4 overflow-y-auto lg:h-full pb-16 lg:pb-6 relative w-full">
        <Link href="/" className="lg:absolute relative lg:top-4 lg:left-6 text-gray-400 hover:text-white transition-colors mb-2 lg:mb-0 bg-[#1e1e2f]/80 lg:bg-transparent self-start">
          ← Dashboard
        </Link>

        <div className="mb-4 text-center w-full max-w-[400px]">
          <h2 className="text-2xl font-bold text-center">Dual-Zone RFID Intersection</h2>
          <p className="text-gray-300 text-center text-sm md:text-base">Phase II Prototype Simulation</p>
        </div>

        <canvas
          ref={canvasRef}
          width={400}
          height={600}
          className="bg-[#333] rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-gray-700 w-full max-w-[400px] h-auto aspect-[2/3] object-contain shrink-0"
        />

        <div className="mt-6 flex flex-col sm:flex-row flex-wrap justify-center gap-3 w-full max-w-[400px] shrink-0">
          <button
            onClick={toggleLight}
            className={`px-4 py-3 flex-1 rounded font-bold transition-all ${isRedLight ? 'bg-red-600 hover:bg-red-400' : 'bg-green-600 hover:bg-green-400'} text-white shadow-lg text-center`}
          >
            {isRedLight ? '🚦 Switch to GREEN' : '🚦 Switch to RED'}
          </button>

          <button onClick={() => setIsModalOpen(true)} className="px-4 py-3 flex-1 bg-blue-600 hover:bg-blue-500 rounded font-bold shadow-lg text-center">
            ⚙️ Script Scenario
          </button>

          <button
            onClick={toggleAutoSpawn}
            className={`px-4 py-3 w-full rounded font-bold transition-all shadow-lg border-2 text-center ${isAutoSpawn ? 'bg-purple-600 border-purple-400 animate-pulse text-white' : 'bg-transparent border-purple-600 text-purple-400 hover:bg-purple-900/30'}`}
          >
            {isAutoSpawn ? '⏸ Stop Auto-Traffic' : '▶️ Start Continuous Traffic'}
          </button>
        </div>
      </div>

      {/* RIGHT LOGS PANEL (Bottom Sheet on Mobile, Static Panel on Desktop) */}
      <div className={`
        fixed bottom-0 left-0 right-0 h-[75vh] z-50 bg-[#2a2a40] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] 
        transition-transform duration-300 ease-in-out flex flex-col p-5 border-t border-gray-600
        lg:static lg:h-full lg:w-[450px] lg:rounded-none lg:shadow-none lg:border-t-0 lg:border-l lg:border-[#333] lg:translate-y-0 lg:shrink-0
        ${isLogsMobileOpen ? 'translate-y-0' : 'translate-y-full'}
      `}>
        {/* Mobile Drag Handle Indicator */}
        <div className="lg:hidden w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-4" onClick={closeLogs} />

        <div className="flex justify-between items-center mb-4 shrink-0">
          <div>
            <h3 className="text-xl md:text-2xl font-bold">Backend Server Logs</h3>
            <p className="text-gray-400 text-xs md:text-sm">Real-time V2I Telemetry & Escalation Matrix</p>
          </div>
          <button onClick={closeLogs} className="lg:hidden text-gray-400 hover:text-white p-2 text-xl font-bold bg-[#1e1e2f] rounded-full w-10 h-10 flex items-center justify-center">
            ✕
          </button>
        </div>

        <div className="flex-1 bg-black p-4 rounded-lg overflow-y-auto font-mono text-[12px] md:text-[13px] border border-gray-700">
          {logs.map((log) => {
            let color = 'text-[#7bed9f]';
            if (log.type === 'WARNING') color = 'text-[#ffa502]';
            if (log.type === 'VIOLATION') color = 'text-[#ff4757] font-bold';

            return (
              <div key={log.id} className={`mb-3 pb-2 border-b border-[#333] flex flex-col ${color}`}>
                <span className="text-[10px] text-gray-500 mb-0.5">[{log.time}] {log.type}</span>
                <span className="leading-tight">{log.msg}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SPAWN CONFIGURATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-[#2a2a40] p-4 md:p-6 rounded-xl shadow-2xl max-w-4xl w-full border border-gray-600 my-8 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold">Configure Vehicle Spawn</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-2xl absolute top-4 right-4 md:static">✕</button>
            </div>

            <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="font-bold">Total Pairs to Spawn:</label>
              <input type="number" min="1" max="10" value={numPairs} onChange={e => setNumPairs(parseInt(e.target.value) || 1)}
                className="p-2 rounded bg-[#1e1e2f] border border-gray-600 w-full sm:w-24 text-center focus:outline-none focus:border-blue-500" />
            </div>

            <p className="text-xs md:text-sm text-gray-400 mb-4">Leave dropdowns on "Random" to let the system auto-assign records.</p>

            <div className="bg-[#1e1e2f] rounded-lg border border-gray-700 overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-[#33334d]">
                  <tr>
                    <th className="p-3 text-sm">#</th>
                    <th className="p-3 text-sm">Assign User (Driver)</th>
                    <th className="p-3 text-sm">Assign Vehicle (Plate)</th>
                    <th className="p-3 text-sm">Will Break Rule?</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, index) => (
                    <tr key={index} className="border-t border-gray-700/50">
                      <td className="p-3 text-gray-500 font-mono text-sm">{index + 1}</td>
                      <td className="p-3">
                        <select value={row.userId} onChange={(e) => {
                          const updated = [...tableRows]; updated[index].userId = e.target.value; setTableRows(updated);
                        }} className="w-full p-2 bg-[#2a2a40] border border-gray-600 rounded outline-none text-sm">
                          <option value="">-- Random User --</option>
                          {dbUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </td>
                      <td className="p-3">
                        <select value={row.vehicleId} onChange={(e) => {
                          const updated = [...tableRows]; updated[index].vehicleId = e.target.value; setTableRows(updated);
                        }} className="w-full p-2 bg-[#2a2a40] border border-gray-600 rounded outline-none text-sm">
                          <option value="">-- Random Vehicle --</option>
                          {dbVehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                        </select>
                      </td>
                      <td className="p-3">
                        <select value={row.willViolate} onChange={(e) => {
                          const updated = [...tableRows]; updated[index].willViolate = e.target.value; setTableRows(updated);
                        }} className="w-full p-2 bg-[#2a2a40] border border-gray-600 rounded outline-none text-sm">
                          <option value="">-- Random Decision --</option>
                          <option value="true">YES (Violator)</option>
                          <option value="false">NO (Safe Driver)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 sm:py-2 rounded border border-gray-600 hover:bg-[#333] w-full sm:w-auto font-semibold">Cancel</button>
              <button onClick={handleManualSpawn} className="px-8 py-3 sm:py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-500 w-full sm:w-auto">
                🚀 Spawn {numPairs} Vehicles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}