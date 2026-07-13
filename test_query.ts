import { supabase } from './src/integrations/supabase/client';

async function main() {
  const { data, error } = await supabase
    .from("task_group_stages")
    .select("id, name, color, position, group_id, task_groups!inner(schedule_mode)")
    .in("id", ["eccba325-458f-4be0-bc8c-b55849400860"]);
  console.log("error:", error);
  console.log("data:", JSON.stringify(data, null, 2));
}

main();
