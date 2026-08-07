import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // Verify caller is an authenticated super-admin.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return json({ error: 'Missing authorization' }, 401);
  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller?.user) return json({ error: 'Invalid session' }, 401);
  const isSuper = caller.user.app_metadata?.is_super_admin === true;
  if (!isSuper) return json({ error: 'Forbidden: super-admin only' }, 403);

  let body: { email?: string; password?: string; full_name?: string; role_ids?: string[]; is_super_admin?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const { email, password, full_name, role_ids, is_super_admin } = body;
  if (!email || !password) return json({ error: 'email and password are required' }, 400);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: full_name ? { full_name } : {},
    app_metadata: { provider: 'email', providers: ['email'], is_super_admin: is_super_admin === true },
  });
  if (createErr || !created?.user) return json({ error: createErr?.message ?? 'Failed to create user' }, 400);

  const newId = created.user.id;
  if (Array.isArray(role_ids) && role_ids.length > 0) {
    const rows = role_ids.map((role_id) => ({ user_id: newId, role_id }));
    const { error: roleErr } = await admin.from('user_roles').insert(rows);
    if (roleErr) return json({ user_id: newId, warning: `User created but role assignment failed: ${roleErr.message}` }, 200);
  }

  return json({ user_id: newId, email }, 200);
});
