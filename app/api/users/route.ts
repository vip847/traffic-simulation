import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, licenseNumber } = body;

    const { data, error } = await supabase
      .from('users')
      .insert([{ name: name, license_number: licenseNumber, status: 'ACTIVE' }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, user: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}