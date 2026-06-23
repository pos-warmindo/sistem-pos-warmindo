import { redirect } from "next/navigation";

/**
 * Root page — redirects to login.
 * Auth middleware handles further routing based on user role.
 */
export default function RootPage() {
  redirect("/auth/login");
}
