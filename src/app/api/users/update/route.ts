import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/users/update
 *
 * Updates display_name, phone, and/or role for an existing user.
 * Requires caller to be authenticated as owner.
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

    // 2. Parse body
    const body = await request.json();
    const { user_id, display_name, phone, role } = body as {
      user_id: string;
      display_name?: string;
      phone?: string;
      role?: "cashier" | "owner";
    };

    if (!user_id) {
      return NextResponse.json({ error: "user_id wajib diisi." }, { status: 400 });
    }
    if (role && !["cashier", "owner"].includes(role)) {
      return NextResponse.json({ error: "Role tidak valid." }, { status: 400 });
    }

    const admin = createAdminClient();

    // 3. Update public.users if profile fields provided
    const profileUpdates: Record<string, string | null> = {};
    if (display_name !== undefined) profileUpdates.display_name = display_name.trim() || null;
    if (phone        !== undefined) profileUpdates.phone        = phone.trim()        || null;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await admin
        .from("users")
        .update(profileUpdates)
        .eq("id", user_id);

      if (profileError) {
        return NextResponse.json(
          { error: "Gagal memperbarui profil: " + profileError.message },
          { status: 500 }
        );
      }
    }

    // 4. Update role if provided
    if (role) {
      const { data: roleRow, error: roleErr } = await admin
        .from("roles")
        .select("id")
        .eq("name", role)
        .single();

      if (roleErr || !roleRow) {
        return NextResponse.json({ error: "Role tidak ditemukan." }, { status: 500 });
      }

      // Upsert user_roles (delete old + insert new)
      await admin.from("user_roles").delete().eq("user_id", user_id);

      const { error: userRoleError } = await admin
        .from("user_roles")
        .insert({ user_id, role_id: roleRow.id });

      if (userRoleError) {
        return NextResponse.json(
          { error: "Gagal memperbarui role: " + userRoleError.message },
          { status: 500 }
        );
      }
    }

    // 5. Return updated user data
    const { data: updatedUser } = await admin
      .from("users")
      .select("id, display_name, phone")
      .eq("id", user_id)
      .single();

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: any) {
    console.error("[/api/users/update] Unexpected error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
