import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plateNumber } = body;

    const { data, error } = await supabase
      .from('vehicles')
      .insert([{ plate_number: plateNumber }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, vehicle: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}