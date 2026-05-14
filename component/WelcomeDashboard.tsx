// app/page.tsx
import Link from 'next/link';

export default function WelcomeDashboard() {
  return (
    <div className="min-h-screen bg-[#1e1e2f] text-white p-6 md:p-10 flex flex-col items-center overflow-y-auto">
      
      {/* Header */}
      <div className="text-center mb-10 mt-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-linear-to-r from-[#7bed9f] to-[#3498db] text-transparent bg-clip-text">
          Welcome to<br />V2I Admin Central
        </h1>
        <p className="text-gray-400 text-sm md:text-base">Next-Gen Traffic Enforcement Management System</p>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
        <Link href="/users" className="block p-6 bg-[#2a2a40] rounded-xl hover:bg-[#33334d] hover:-translate-y-1 transition-all duration-300 border border-[#7bed9f] shadow-lg group">
          <h2 className="text-2xl font-bold mb-2 text-[#7bed9f] group-hover:text-green-300">👥 Manage Users</h2>
          <p className="text-gray-400 text-sm leading-relaxed">Register new drivers, view license status, and track penalty escalation histories.</p>
        </Link>

        <Link href="/vehicles" className="block p-6 bg-[#2a2a40] rounded-xl hover:bg-[#33334d] hover:-translate-y-1 transition-all duration-300 border border-[#ffa502] shadow-lg group">
          <h2 className="text-2xl font-bold mb-2 text-[#ffa502] group-hover:text-yellow-400">🚗 Manage Vehicles</h2>
          <p className="text-gray-400 text-sm leading-relaxed">Register new vehicle plate numbers into the tracking database and view vehicle logs.</p>
        </Link>

        <Link href="/simulation" className="block p-6 bg-[#2a2a40] rounded-xl hover:bg-[#33334d] hover:-translate-y-1 transition-all duration-300 border border-[#ff4757] shadow-lg shadow-red-900/20 group">
          <h2 className="text-2xl font-bold mb-2 text-[#ff4757] group-hover:text-red-400">🚦 Live Simulation</h2>
          <p className="text-gray-400 text-sm leading-relaxed">Launch the real-time V2I intersection monitoring edge node and run test scenarios.</p>
        </Link>
      </div>

      {/* Quick Start Guide Section */}
      <div className="max-w-5xl w-full bg-[#2a2a40] p-6 md:p-8 rounded-xl shadow-2xl border border-gray-700 mb-10">
        <h2 className="text-2xl font-bold mb-6 border-b border-gray-700 pb-4 flex items-center gap-3">
          📋 Quick Start Guide: How to Run the Simulation
        </h2>
        
        <div className="space-y-8">
          
          {/* Step 1 */}
          <div className="flex gap-4 md:gap-6">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#7bed9f] text-[#1e1e2f] flex items-center justify-center font-bold text-lg shadow-lg shadow-green-900/50">
              1
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#7bed9f] mb-1">Populate the Database</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Before running a simulation, navigate to <strong>Manage Users</strong> and <strong>Manage Vehicles</strong>. Create a few test drivers (e.g., "Rahul") and register a few license plates (e.g., "MH-31-XY99").
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4 md:gap-6">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-900/50">
              2
            </div>
            <div>
              <h3 className="text-xl font-bold text-blue-400 mb-1">Launch the Edge Node</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Click on the <strong>Live Simulation</strong> card. This opens the real-time intersection view. Ensure the traffic light is set to <strong>RED</strong> using the toggle button.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4 md:gap-6">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-900/50">
              3
            </div>
            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-1">Script a Scenario</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Click the <strong>⚙️ Script Scenario</strong> button. Here you can pair specific drivers with specific vehicles. Set their decision to <strong>YES (Violator)</strong> to force them to run the red light, then click Spawn.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4 md:gap-6">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#ff4757] text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-red-900/50">
              4
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#ff4757] mb-1">Observe the Escalation Engine</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Watch the Server Logs panel. As a violator crosses <strong>Zone B (Trap)</strong>, the backend catches them. Repeated violations by the same user will trigger the 3-Cycle Escalation Matrix, increasing fines until their license is permanently marked as LAPSED.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4 md:gap-6">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#ffa502] text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-yellow-900/50">
              5
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#ffa502] mb-1">Test the Smart Immobilizer</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Try spawning a driver who currently has an <strong>UNPAID</strong> challan on their record. The V2I simulation will instantly detect the pending fine via database lookup and digitally immobilize the vehicle at the starting line.
              </p>
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}