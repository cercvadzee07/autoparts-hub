import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { DemoRepository } from "./demo-repository";
import { SupabaseRepository } from "./supabase-repository";
import type { Repository } from "./repository";

let instance: Repository | null = null;

/** Supabase when credentials are present, otherwise the local demo database. */
export function getRepository(): Repository {
  if (!instance) instance = isSupabaseConfigured() ? new SupabaseRepository() : new DemoRepository();
  return instance;
}

export type { Repository, Actor } from "./repository";
