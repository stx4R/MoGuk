import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const FAIL = () => NextResponse.json({ error: 'Something went wrong.' }, { status: 400 });

function normalizeName(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  const body = await request.json() as { email?: string; password?: string; name?: string; otp?: string };
  const email    = body.email?.trim();
  const password = body.password;
  const name     = body.name ? normalizeName(body.name) : undefined;
  const otp      = body.otp?.trim();

  if (!email || !password || !name || !otp) return FAIL();
  if (password.length < 8) return FAIL();
  if (!EMAIL_RE.test(email)) return FAIL();
  const admin = createAdminClient();
  const { data: gate } = await admin.rpc('signup_gate', { p_ip: ip, p_name: name });

  if (!gate?.allowed) return FAIL();
  const attemptId = gate.attempt_id as string;
  const { data: allowed } = await admin
    .from('allowed_names')
    .select('name')
    .eq('name', name)
    .eq('otp', otp)
    .single();

  if (!allowed) return FAIL();
  const { data: takenName } = await admin
    .from('profiles')
    .select('id')
    .eq('name', allowed.name)
    .single();

  if (takenName) return FAIL();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: allowed.name, otp },
  });

  if (createError || !created?.user) return FAIL();
  await admin.auth.admin.updateUserById(created.user.id, { user_metadata: { name: allowed.name, otp: null } });
  await admin.rpc('signup_mark_success', { p_attempt_id: attemptId });

  return NextResponse.json({ success: true });
}
