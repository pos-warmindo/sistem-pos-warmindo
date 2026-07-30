import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/users/delete
 *
 * Deletes an auth user (cascade removes public.users + user_roles).
 * Requires caller to be authenticated as owner.
 * Guard: owner cannot delete their own account.
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
    const { user_id } = body as { user_id: string };

    if (!user_id) {
      return NextResponse.json({ error: "user_id wajib diisi." }, { status: 400 });
    }

    // 3. Guard: cannot delete self
    if (user_id === user.id) {
      return NextResponse.json(
        { error: "Anda tidak bisa menghapus akun Anda sendiri." },
        { status: 400 }
      );
    }

    // 4. Delete via admin. We remove dependent rows first because the FKs to
    //    auth.users may not be ON DELETE CASCADE — otherwise auth.admin.deleteUser
    //    fails with a DB error (GoTrue returns an empty 500 body -> message "{}").
    const admin = createAdminClient();

    // 4a. Remove role assignments (user_roles.user_id -> user).
    const { error: rolesError } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", user_id);
    if (rolesError) {
      console.error("[/api/users/delete] user_roles delete failed:", rolesError);
      return NextResponse.json(
        { error: "Gagal menghapus role user: " + rolesError.message },
        { status: 500 }
      );
    }

    // 4b. Remove the public profile row (public.users.id -> auth.users.id).
    const { error: profileError } = await admin
      .from("users")
      .delete()
      .eq("id", user_id);
    if (profileError) {
      console.error("[/api/users/delete] public.users delete failed:", profileError);
      return NextResponse.json(
        { error: "Gagal menghapus profil user: " + profileError.message },
        { status: 500 }
      );
    }

    // 4c. Finally remove the auth user.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user_id);
    if (deleteError) {
      console.error("[/api/users/delete] auth deleteUser failed:", deleteError);
      const detail = deleteError.message?.trim() ? deleteError.message : String(deleteError.status ?? "unknown error");
      return NextResponse.json(
        { error: "Gagal menghapus user: " + detail },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted_user_id: user_id });
  } catch (err: any) {
    console.error("[/api/users/delete] Unexpected error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
