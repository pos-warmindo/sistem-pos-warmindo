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
    if (roleData !== "owner" && roleData !== "admin") {
      return NextResponse.json({ error: "Forbidden: owner or admin only" }, { status: 403 });
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

    // 4. Delete via admin (cascade removes public.users & user_roles via FK)
    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Gagal menghapus user: " + deleteError.message },
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
