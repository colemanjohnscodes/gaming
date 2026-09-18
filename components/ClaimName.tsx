"use client";

import { useEffect } from "react";
import { clearPendingName, loadPendingName } from "@/lib/pending-name";
import { ensureParlorProfile } from "@/lib/scores";
import { createClient } from "@/lib/supabase/client";

export function ClaimName() {
  useEffect(() => {
    const name = loadPendingName();
    if (!name) {
      return;
    }
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        return;
      }
      const result = await ensureParlorProfile(supabase, data.user, name);
      if (result.ok) {
        clearPendingName();
      }
    });
  }, []);

  return null;
}
