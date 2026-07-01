import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * GET /api/users
 *
 * Lists all application users with their profile data, role names, and emails.
 * Requires caller to be authenticated as owner.
 * Uses SUPABASE_SERVICE_ROLE_KEY to retrieve email addresses from auth schema.
 */
export async function GET(request: NextRequest) {
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

    // 2. Fetch auth users via admin client
    const admin = createAdminClient();
    const { data: authUsersData, error: authListError } = await admin.auth.admin.listUsers();
    if (authListError || !authUsersData?.users) {
      return NextResponse.json(
        { error: authListError?.message ?? "Gagal mengambil data auth." },
        { status: 500 }
      );
    }

    const authUsers = authUsersData.users;

    // 3. Fetch public users & their role assignments
    const { data: publicUsers, error: publicUsersError } = await admin
      .from("users")
      .select(`
        id,
        display_name,
        phone,
        created_at,
        user_roles (
          role_id,
          roles (
            name
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (publicUsersError) {
      return NextResponse.json({ error: publicUsersError.message }, { status: 500 });
    }

    // 4. Map emails and role names
    const mappedUsers = publicUsers.map((pu) => {
      const au = authUsers.find((u) => u.id === pu.id);
      
      const rolesArray = pu.user_roles as any;
      let roleName = null;
      if (Array.isArray(rolesArray) && rolesArray.length > 0) {
        roleName = rolesArray[0]?.roles?.name || null;
      } else if (rolesArray && typeof rolesArray === 'object') {
        roleName = (rolesArray as any).roles?.name || null;
      }

      return {
        id: pu.id,
        display_name: pu.display_name,
        phone: pu.phone,
        created_at: pu.created_at,
        email: au?.email || null,
        role: roleName,
      };
    });

    return NextResponse.json({ success: true, users: mappedUsers });
  } catch (err: any) {
    console.error("[/api/users] Unexpected error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
