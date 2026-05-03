import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plateNumber, driverName, zone } = body;

    // --- SETUP: Find or Create User & Vehicle ---
    // (In a real system, hardware reads plate + RFID tag of driver)
    let { data: user } = await supabase.from('users').select('*').eq('name', driverName).single();
    if (!user) {
      const { data: newUser } = await supabase.from('users').insert([{ name: driverName, license_number: `LIC-${Date.now()}` }]).select().single();
      user = newUser;
    }

    let { data: vehicle } = await supabase.from('vehicles').select('*').eq('plate_number', plateNumber).single();
    if (!vehicle) {
      const { data: newVehicle } = await supabase.from('vehicles').insert([{ plate_number: plateNumber }]).select().single();
      vehicle = newVehicle;
    }

    // ==========================================
    // ALGORITHM IMPLEMENTATION
    // ==========================================

    // STEP 2: Critical Status Check
    if (user.status === 'LAPSED') {
      return NextResponse.json({ 
        alert: 'CRITICAL_ARREST', 
        message: `POLICE DISPATCHED: ${driverName} is driving with a LAPSED license!` 
      }, { status: 403 });
    }

    // STEP 3: History Retrieval
    const { count } = await supabase
      .from('challans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    const currentOffenseNumber = (count || 0) + 1;

    // STEP 4: The Escalation Matrix
    let penalty = "Fine";
    let fineAmount = 500.00;
    let terminalLapse = false;

    // Cycle 1
    if (currentOffenseNumber === 1 || currentOffenseNumber === 2) { 
      penalty = "Fine"; fineAmount = 500; 
    }
    else if (currentOffenseNumber === 3) { 
      penalty = "Fine + Mandatory Training"; fineAmount = 1500; 
    }
    // Cycle 2
    else if (currentOffenseNumber === 4 || currentOffenseNumber === 5) { 
      penalty = "Fine"; fineAmount = 2500; 
    }
    else if (currentOffenseNumber === 6) { 
      penalty = "Extra Fine"; fineAmount = 5000; 
    }
    // Cycle 3 (Terminal)
    else if (currentOffenseNumber === 7 || currentOffenseNumber === 8) { 
      penalty = "Fine"; fineAmount = 7500; 
    }
    else if (currentOffenseNumber >= 9) { 
      penalty = "Extra Fine + Imprisonment + License Lapsed"; 
      fineAmount = 25000; 
      terminalLapse = true; 
    }

    // STEP 5: Database Logging
    const { data: newChallan, error: challanError } = await supabase
      .from('challans')
      .insert([{
        vehicle_id: vehicle.id,
        user_id: user.id,
        zone: zone,
        fine_amount: fineAmount,
        status: 'UNPAID',
        offense_number: currentOffenseNumber,
        penalty_details: penalty
      }])
      .select()
      .single();

    if (challanError) throw challanError;

    // STEP 6: Status Update
    if (terminalLapse) {
      await supabase.from('users').update({ status: 'LAPSED' }).eq('id', user.id);
    }

    // STEP 7: Penalty Execution (Simulated Dispatch)
    return NextResponse.json({ 
      success: true, 
      dispatch: {
        smsSentTo: driverName,
        offenseNumber: currentOffenseNumber,
        penaltyApplied: penalty,
        fine: fineAmount
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Backend Escalation Error:", error);
    return NextResponse.json({ error: 'Failed to process penalty matrix' }, { status: 500 });
  }
}