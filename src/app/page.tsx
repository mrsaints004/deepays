import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginPage } from "@/components/login-page";

export default async function Home() {
  const user = await getSession();
  if (user) redirect("/earn");

  return <LoginPage />;
}
