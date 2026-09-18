"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureParlorProfile, normalizeDisplayName } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";

export async function withdrawName() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function amendName(formData: FormData) {
  const name = normalizeDisplayName(
    String(formData.get("display_name") ?? ""),
  );
  if (!name) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/login");
  }

  await ensureParlorProfile(supabase, data.user, name);
  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/login");
  redirect("/login");
}
