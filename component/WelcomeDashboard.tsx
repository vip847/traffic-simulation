// app/page.tsx
import Link from 'next/link';

export default function WelcomeDashboard() {
  return (
    <div className="min-h-screen bg-[#1e1e2f] text-white p-10 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-2">Welcome to</h1>
      <h1 className="text-4xl font-bold mb-2">V2I Admin Central</h1>
      <p className="text-gray-400 mb-10">Traffic Enforcement System Management</p>

      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full justify-center items-center">
        <Link href="/users" className="block p-6 bg-[#2a2a40] rounded-lg hover:bg-[#33334d] transition-colors border border-gray-700">
          <h2 className="text-2xl font-bold mb-2 text-[#7bed9f]">👥 Manage Users</h2>
          <p className="text-gray-400 text-sm">Register new drivers, view license status, and track penalty escalation.</p>
        </Link>

        <Link href="/vehicles" className="block p-6 bg-[#2a2a40] rounded-lg hover:bg-[#33334d] transition-colors border border-gray-700">
          <h2 className="text-2xl font-bold mb-2 text-[#ffa502]">🚗 Manage Vehicles</h2>
          <p className="text-gray-400 text-sm">Register new vehicle plate numbers into the tracking database.</p>
        </Link>

        <Link href="/simulation" className="block p-6 bg-[#2a2a40] rounded-lg hover:bg-[#33334d] transition-colors border border-[#ff4757]">
          <h2 className="text-2xl font-bold mb-2 text-[#ff4757]">🚦 Live Simulation</h2>
          <p className="text-gray-400 text-sm">Launch the real-time V2I intersection monitoring edge node.</p>
        </Link>
      </div>
    </div>
  );
}