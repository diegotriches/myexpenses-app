import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  return Number(session.user.id);
}

export async function getSession() {
  return await getServerSession(authOptions);
}