import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/users/create
 *
 * Creates a new auth user, profile in public.users, and assigns a role.
 * Requires caller to be authenticated as owner.
 * Uses SUPABASE_SERVICE_ROLE_KEY for privileged auth operations.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify caller is owner
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: roleData } = await supabase.rpc("get_my_role");
    if (roleData !== "owner") {
      return NextResponse.json({ error: "Forbidden: owner only" }, { status: 403 });
    }

    // 2. Parse + validate body
    const body = await request.json();
    const { email, password, display_name, phone, role } = body as {
      email: string;
      password: string;
      display_name: string;
      phone?: string;
      role: "cashier" | "owner";
    };

    if (!email?.trim())         return NextResponse.json({ error: "Email wajib diisi." },           { status: 400 });
    if (!password || password.length < 6)
                                return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
    if (!display_name?.trim())  return NextResponse.json({ error: "Nama wajib diisi." },            { status: 400 });
    if (!role || !["cashier","owner"].includes(role))
                                return NextResponse.json({ error: "Role tidak valid." },             { status: 400 });

    // 3. Create auth user via admin client (SERVICE_ROLE)
    const admin = createAdminClient();
    const { data: newAuthUser, error: createError } = await admin.auth.admin.createUser({
      email:          email.trim().toLowerCase(),
      password,
      email_confirm:  true,          // skip email confirmation
    });

    if (createError || !newAuthUser.user) {
      return NextResponse.json(
        { error: createError?.message ?? "Gagal membuat akun." },
        { status: 400 }
      );
    }

    const newUserId = newAuthUser.user.id;

    // 4. INSERT into public.users
    const { error: profileError } = await admin
      .from("users")
      .insert({
        id:           newUserId,
        display_name: display_name.trim(),
        phone:        phone?.trim() || null,
      });

    if (profileError) {
      // Rollback: delete auth user
      await admin.auth.admin.deleteUser(newUserId).catch(console.error);
      return NextResponse.json(
        { error: "Gagal menyimpan profil: " + profileError.message },
        { status: 500 }
      );
    }

    // 5. Lookup role_id
    const { data: roleRow, error: roleErr } = await admin
      .from("roles")
      .select("id")
      .eq("name", role)
      .single();

    if (roleErr || !roleRow) {
      await admin.auth.admin.deleteUser(newUserId).catch(console.error);
      return NextResponse.json({ error: "Role tidak ditemukan di database." }, { status: 500 });
    }

    // 6. INSERT into user_roles
    const { error: userRoleError } = await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role_id: roleRow.id });

    if (userRoleError) {
      await admin.auth.admin.deleteUser(newUserId).catch(console.error);
      return NextResponse.json(
        { error: "Gagal menetapkan role: " + userRoleError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id:           newUserId,
        display_name: display_name.trim(),
        email:        email.trim().toLowerCase(),
        role,
      },
    });
  } catch (err: any) {
    console.error("[/api/users/create] Unexpected error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
