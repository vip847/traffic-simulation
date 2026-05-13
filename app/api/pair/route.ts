// app/api/pair/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const numPairs = body.numPairs ? parseInt(body.numPairs, 10) : 1;
    // The table of requested configurations
    const table: Array<{ userId?: string, vehicleId?: string, willViolate?: string }> = Array.isArray(body.table) ? body.table : [];

    const { data: allUsers, error: userErr } = await supabase.from('users').select('*, challans(*)');
    const { data: allVehicles, error: vehErr } = await supabase.from('vehicles').select('*, challans(*)');

    if (userErr || vehErr) throw new Error("Failed to fetch database records");
    if (numPairs > allUsers!.length || numPairs > allVehicles!.length) {
      return NextResponse.json({ success: false, error: `Not enough records for ${numPairs} pairs.` }, { status: 400 });
    }

    let finalPairs: any[] = [];
    let usedUserIds = new Set<string>();
    let usedVehicleIds = new Set<string>();

    // Helper to get random unused
    const getRandomUnused = (items: any[], usedSet: Set<string>) => {
      const unused = items.filter(item => !usedSet.has(item.id));
      return unused.length > 0 ? shuffleArray(unused)[0] : null;
    };

    // STEP 1: Process the explicit table rows provided by the user
    for (let i = 0; i < Math.min(table.length, numPairs); i++) {
      const row = table[i];
      let selectedUser = null;
      let selectedVehicle = null;

      // Assign User
      if (row.userId && !usedUserIds.has(row.userId)) {
        selectedUser = allUsers!.find(u => u.id === row.userId);
      }
      if (!selectedUser) selectedUser = getRandomUnused(allUsers!, usedUserIds);

      // Assign Vehicle
      if (row.vehicleId && !usedVehicleIds.has(row.vehicleId)) {
        selectedVehicle = allVehicles!.find(v => v.id === row.vehicleId);
      }
      if (!selectedVehicle) selectedVehicle = getRandomUnused(allVehicles!, usedVehicleIds);

      // Assign Decision
      let willViolate = row.willViolate === 'true' ? true : (row.willViolate === 'false' ? false : Math.random() > 0.5);

      // VVV NEW: Check for unpaid challans VVV
      const userHasUnpaid = selectedUser.challans?.some((c: any) => c.status === 'UNPAID') || false;
      const vehicleHasUnpaid = selectedVehicle.challans?.some((c: any) => c.status === 'UNPAID') || false;

      if (selectedUser && selectedVehicle) {
        usedUserIds.add(selectedUser.id);
        usedVehicleIds.add(selectedVehicle.id);
        finalPairs.push({ user: selectedUser, vehicle: selectedVehicle, willViolate, hasPendingChallans: userHasUnpaid || vehicleHasUnpaid });
      }
    }

    // STEP 2: Fill remaining pairs randomly if numPairs > table.length
    while (finalPairs.length < numPairs) {
      const selectedUser = getRandomUnused(allUsers!, usedUserIds);
      const selectedVehicle = getRandomUnused(allVehicles!, usedVehicleIds);
      const willViolate = Math.random() > 0.5;

      if (selectedUser && selectedVehicle) {
        usedUserIds.add(selectedUser.id);
        usedVehicleIds.add(selectedVehicle.id);
        finalPairs.push({ user: selectedUser, vehicle: selectedVehicle, willViolate });
      } else {
        break; // Failsafe
      }
    }

    return NextResponse.json({ success: true, pairs: finalPairs });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}