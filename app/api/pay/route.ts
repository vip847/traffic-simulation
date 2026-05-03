// app/api/pay/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { paymentType, targetId } = await request.json();

  let query = supabase.from('challans').update({ status: 'PAID' });

  // Dynamically build the query based on what the user wants to pay
  if (paymentType === 'SINGLE_CHALLAN') {
    query = query.eq('id', targetId);
  } else if (paymentType === 'ALL_FOR_VEHICLE') {
    query = query.eq('vehicle_id', targetId).eq('status', 'UNPAID');
  } else if (paymentType === 'ALL_FOR_USER') {
    query = query.eq('user_id', targetId).eq('status', 'UNPAID');
  }

  const { error } = await query;
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, message: "Payment processed successfully" });
}