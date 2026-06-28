import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from "$env/static/public";

export const supabase: SupabaseClient = createClient<Database>(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
