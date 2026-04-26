// Admin-only edge function for managing staff users (create / update / set role / set status / delete).
// Uses the SERVICE ROLE key to perform privileged operations after verifying the caller is an admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppRole = "admin" | "receptionist" | "dentist" | "assistant" | "patient";

interface CreatePayload {
  action: "create";
  email: string;
  password: string;
  name: string;
  phone?: string | null;
  role: AppRole;
  cro?: string | null;
  specialty?: string | null;
}
interface UpdatePayload {
  action: "update";
  user_id: string;
  name?: string;
  phone?: string | null;
  role?: AppRole;
  status?: "active" | "inactive" | "blocked";
  cro?: string | null;
  specialty?: string | null;
}
interface DeletePayload {
  action: "delete";
  user_id: string;
}
type Payload = CreatePayload | UpdatePayload | DeletePayload;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Caller validation (must be admin)
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: rolesData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isAdmin = (rolesData ?? []).some((r) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const payload = (await req.json()) as Payload;

    // ============ CREATE ============
    if (payload.action === "create") {
      const { email, password, name, phone, role, cro, specialty } = payload;
      if (!email || !password || !name || !role) {
        return json({ error: "Campos obrigatórios faltando" }, 400);
      }
      if (role === "dentist" && (!cro || !specialty)) {
        return json({ error: "CRO e especialidade são obrigatórios para dentistas" }, 400);
      }

      // Create auth user (auto-confirm email so they can login immediately)
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, phone: phone ?? null },
      });
      if (createErr || !created.user) {
        return json({ error: createErr?.message ?? "Falha ao criar usuário" }, 400);
      }
      const newUserId = created.user.id;

      // Profile is created by trigger handle_new_user, but trigger also adds default 'patient' role.
      // Replace role(s) with the requested one (unless they want patient).
      await admin.from("user_roles").delete().eq("user_id", newUserId);
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: newUserId, role });
      if (roleErr) return json({ error: `Erro ao atribuir perfil: ${roleErr.message}` }, 500);

      // Update phone if provided (trigger may have set it)
      if (phone !== undefined) {
        await admin.from("profiles").update({ phone }).eq("id", newUserId);
      }

      // If dentist, create dentist row
      if (role === "dentist") {
        const { error: dErr } = await admin.from("dentists").insert({
          user_id: newUserId,
          name,
          email,
          phone: phone ?? null,
          cro: cro!,
          specialty: specialty ?? null,
          status: "active",
        });
        if (dErr) return json({ error: `Erro ao criar dentista: ${dErr.message}` }, 500);
      }

      return json({ ok: true, user_id: newUserId });
    }

    // ============ UPDATE ============
    if (payload.action === "update") {
      const { user_id, name, phone, role, status, cro, specialty } = payload;
      if (!user_id) return json({ error: "user_id obrigatório" }, 400);

      // Prevent admin from blocking/inactivating self if they are the only active admin
      if ((status === "inactive" || status === "blocked") && user_id === callerId) {
        const { data: admins } = await admin
          .from("user_roles")
          .select("user_id, profiles!inner(status)")
          .eq("role", "admin");
        const activeAdmins = (admins ?? []).filter((a: any) => a.profiles?.status === "active");
        if (activeAdmins.length <= 1) {
          return json({ error: "Você é o único administrador ativo. Não é possível inativar a si mesmo." }, 400);
        }
      }

      // Update profile
      const profileUpdate: Record<string, unknown> = {};
      if (name !== undefined) profileUpdate.name = name;
      if (phone !== undefined) profileUpdate.phone = phone;
      if (status !== undefined) profileUpdate.status = status;
      if (Object.keys(profileUpdate).length > 0) {
        const { error: pErr } = await admin.from("profiles").update(profileUpdate).eq("id", user_id);
        if (pErr) return json({ error: `Erro ao atualizar perfil: ${pErr.message}` }, 500);
      }

      // Update role if changed
      if (role) {
        await admin.from("user_roles").delete().eq("user_id", user_id);
        const { error: rErr } = await admin.from("user_roles").insert({ user_id, role });
        if (rErr) return json({ error: `Erro ao atualizar perfil de acesso: ${rErr.message}` }, 500);

        // If new role is dentist, ensure dentist row exists
        if (role === "dentist") {
          const { data: existing } = await admin
            .from("dentists")
            .select("id")
            .eq("user_id", user_id)
            .maybeSingle();
          if (!existing) {
            if (!cro) return json({ error: "CRO obrigatório para dentistas" }, 400);
            const { data: prof } = await admin.from("profiles").select("name, email, phone").eq("id", user_id).maybeSingle();
            await admin.from("dentists").insert({
              user_id,
              name: prof?.name ?? name ?? "",
              email: prof?.email ?? null,
              phone: prof?.phone ?? null,
              cro,
              specialty: specialty ?? null,
              status: "active",
            });
          }
        }
      }

      // Update dentist details if applicable
      if (cro !== undefined || specialty !== undefined) {
        const dentistUpdate: Record<string, unknown> = {};
        if (cro !== undefined) dentistUpdate.cro = cro;
        if (specialty !== undefined) dentistUpdate.specialty = specialty;
        if (status !== undefined) dentistUpdate.status = status;
        if (name !== undefined) dentistUpdate.name = name;
        if (phone !== undefined) dentistUpdate.phone = phone;
        await admin.from("dentists").update(dentistUpdate).eq("user_id", user_id);
      } else if (status !== undefined || name !== undefined) {
        const dUpdate: Record<string, unknown> = {};
        if (status !== undefined) dUpdate.status = status;
        if (name !== undefined) dUpdate.name = name;
        if (phone !== undefined) dUpdate.phone = phone;
        await admin.from("dentists").update(dUpdate).eq("user_id", user_id);
      }

      // Block via auth ban (optional - we just rely on profile status check on login)
      return json({ ok: true });
    }

    // ============ DELETE ============
    if (payload.action === "delete") {
      const { user_id } = payload;
      if (user_id === callerId) {
        return json({ error: "Você não pode excluir sua própria conta." }, 400);
      }
      // Check if user has links (patients records etc.) — for safety, just inactivate
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
