'use client';

import React, { useEffect, useRef, useState } from 'react';

// --- Types ---
interface Car {
  id: string;
  x: number;
  y: number;
  speed: number;
  isViolator: boolean;
  color: string;
  flagged: boolean;
  fined: boolean;
}

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: 'system' | 'warning' | 'violation';
}

export default function TrafficSimulation() {
  // --- React State for UI ---
  const [isRedLight, setIsRedLight] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // --- Refs for Canvas Animation Loop (prevents UI re-renders) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const isRedLightRef = useRef(true); // Mirrored for the canvas loop
  const carsRef = useRef<Car[]>([]);
  const carCounterRef = useRef(1000);

  // --- Constants ---
  const STOP_LINE_Y = 300;
  const ZONE_A_Y = 280;
  const ZONE_A_H = 40;
  const ZONE_B_Y = 150;
  const ZONE_B_H = 60;

  // --- Helpers ---
  const addLog = (message: string, type: 'system' | 'warning' | 'violation' = 'system') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ id: Date.now() + Math.random(), time, message, type }, ...prev]);
  };

  const toggleLight = () => {
    const newState = !isRedLight;
    setIsRedLight(newState);
    isRedLightRef.current = newState; // Update ref for canvas loop

    if (newState) {
      addLog('Traffic Light turned RED. RFID Tracking Active.', 'system');
    } else {
      addLog('Traffic Light turned GREEN. Stop Line queue cleared.', 'system');
      carsRef.current.forEach((car) => (car.flagged = false));
    }
  };

  const spawnCar = (isViolator: boolean) => {
    carCounterRef.current++;
    carsRef.current.push({
      id: `MH-31-${carCounterRef.current}`,
      x: 180,
      y: 650,
      speed: 3,
      isViolator: isViolator,
      color: isViolator ? '#ffa502' : '#7bed9f',
      flagged: false,
      fined: false,
    });
  };

  // --- Canvas Animation Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    addLog('System Booted. Active V2I Tracking Online.', 'system');

    const drawRoad = () => {
      // Road background
      ctx.fillStyle = '#444';
      ctx.fillRect(100, 0, 200, 600);

      // Center line
      ctx.strokeStyle = '#fff';
      ctx.setLineDash([15, 15]);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(200, 0);
      ctx.lineTo(200, 600);
      ctx.stroke();
      ctx.setLineDash([]);

      // Zone A (Stop Line)
      ctx.fillStyle = 'rgba(255, 165, 2, 0.2)';
      ctx.fillRect(100, ZONE_A_Y, 200, ZONE_A_H);
      ctx.fillStyle = '#ffa502';
      ctx.font = '12px Arial';
      ctx.fillText('ZONE A (Stop Line)', 105, ZONE_A_Y + 15);

      // Solid Stop Line
      ctx.fillStyle = '#fff';
      ctx.fillRect(100, STOP_LINE_Y, 200, 8);

      // Zone B (Intersection Trap)
      ctx.fillStyle = 'rgba(255, 71, 87, 0.2)';
      ctx.fillRect(100, ZONE_B_Y, 200, ZONE_B_H);
      ctx.fillStyle = '#ff4757';
      ctx.fillText('ZONE B (Trap)', 105, ZONE_B_Y + 15);

      // Draw Traffic Light Indicator (Using Ref)
      ctx.fillStyle = '#222';
      ctx.fillRect(320, 250, 40, 100);
      ctx.beginPath();
      ctx.arc(340, 275, 12, 0, Math.PI * 2);
      ctx.fillStyle = isRedLightRef.current ? '#ff4757' : '#555';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(340, 325, 12, 0, Math.PI * 2);
      ctx.fillStyle = !isRedLightRef.current ? '#2ed573' : '#555';
      ctx.fill();
    };

    const updateAndDrawCars = () => {
      const cars = carsRef.current;
      for (let i = 0; i < cars.length; i++) {
        let car = cars[i];
        let shouldStop = false;

        // Use isRedLightRef to check light status inside the animation loop
        if (isRedLightRef.current && !car.isViolator) {
          if (car.y <= STOP_LINE_Y + 40 && car.y > STOP_LINE_Y) {
            shouldStop = true;
          }
        }

        if (!shouldStop) {
          car.y -= car.speed;
        }

        // RFID LOGIC IMPLEMENTATION
        if (isRedLightRef.current) {
          // Check Zone A
          if (car.y < ZONE_A_Y + ZONE_A_H && car.y > ZONE_A_Y && !car.flagged) {
            car.flagged = true;
            addLog(`Vehicle ${car.id} detected at Stop Line.`, 'warning');
          }

          // Check Zone B
          if (car.y < ZONE_B_Y + ZONE_B_H && car.y > ZONE_B_Y && car.flagged && !car.fined) {
            car.fined = true;
            addLog(`CRITICAL: Vehicle ${car.id} crossed intersection! Fine Issued.`, 'violation');
          }
        }

        // Draw Car
        ctx.fillStyle = car.color;
        ctx.fillRect(car.x, car.y, 40, 70);

        // Draw ID on car
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.fillText(car.id, car.x + 2, car.y + 35);
      }

      // Filter off-screen cars
      carsRef.current = cars.filter((car) => car.y > -100);
    };

    const gameLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawRoad();
      updateAndDrawCars();
      requestRef.current = requestAnimationFrame(gameLoop);
    };

    // Start Loop
    requestRef.current = requestAnimationFrame(gameLoop);

    // Cleanup on component unmount
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // --- Render ---
  return (
    <div className="flex h-screen bg-[#1e1e2f] text-white font-sans overflow-hidden">

      {/* Left Panel - Simulation */}
      <div className="flex-1 p-5 flex flex-col items-center border-r-2 border-[#333] overflow-y-auto">
        <div className="mb-2 text-center">
          <h2 className="text-2xl font-bold">Dual-Zone RFID Intersection</h2>
          <p className="text-gray-300">Phase II Prototype Simulation</p>
        </div>

        <canvas
          ref={canvasRef}
          width={400}
          height={600}
          className="bg-[#333] rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.5)] mt-4"
        />

        <div className="mt-6 flex gap-3">
          <button
            onClick={toggleLight}
            style={{ backgroundColor: isRedLight ? '#ff4757' : '#2ed573' }}
            className="px-4 py-2 border-none rounded cursor-pointer font-bold transition-opacity hover:opacity-80 text-white"
          >
            {isRedLight ? 'Switch to GREEN Light' : 'Switch to RED Light'}
          </button>
          <button
            onClick={() => spawnCar(false)}
            className="bg-[#2ed573] text-white px-4 py-2 border-none rounded cursor-pointer font-bold transition-opacity hover:opacity-80"
          >
            Spawn Safe Driver
          </button>
          <button
            onClick={() => spawnCar(true)}
            className="bg-[#ffa502] text-white px-4 py-2 border-none rounded cursor-pointer font-bold transition-opacity hover:opacity-80"
          >
            Spawn Violator
          </button>
        </div>
      </div>

      {/* Right Panel - Logs */}
      <div className="w-100 bg-[#2a2a40] p-5 flex flex-col">
        <div className="mb-4">
          <h3 className="text-xl font-bold">Backend Server Logs</h3>
          <p className="text-gray-400 text-sm">Real-time Penalty Engine</p>
        </div>

        <div className="flex-1 bg-black rounded p-3 overflow-y-auto font-mono text-[13px] flex flex-col">
          {logs.map((log) => {
            let textColor = 'text-[#7bed9f]'; // Default system
            if (log.type === 'warning') textColor = 'text-[#ffa502]';
            if (log.type === 'violation') textColor = 'text-[#ff4757] font-bold';

            return (
              <div
                key={log.id}
                className={`mb-1.5 pb-1.5 border-b border-[#333] ${textColor}`}
              >
                [{log.time}] {log.message}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}