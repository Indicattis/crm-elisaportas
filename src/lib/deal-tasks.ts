import { supabase } from "@/integrations/supabase/client";

/**
 * Recreate deal tasks by calling the server-side RPC.
 * This deletes pending tasks and creates new ones based on the current column's task group.
 */
export async function recreateDealTasks(dealId: string) {
  await supabase.rpc("recreate_deal_tasks", { _deal_id: dealId });
}
