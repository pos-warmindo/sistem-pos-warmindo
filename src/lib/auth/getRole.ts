import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

export async function getRole(): Promise<'cashier' | 'owner' | null> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // Query user_roles and join with roles to find the name of the role
  const { data, error } = await supabase
    .from("user_roles")
    .select(`
      roles (
        name
      )
    `)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  // Type assertion since relations can be represented as objects or arrays in supabase-js
  const roleRelation = data.roles as any;
  
  if (roleRelation && typeof roleRelation.name === "string") {
    return roleRelation.name as 'cashier' | 'owner';
  }

  return null;
}
