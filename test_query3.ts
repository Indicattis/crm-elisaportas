import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(url, key);

async function main() {
  // Test 1: simple select
  const { data: data1, error: error1 } = await supabase
    .from("task_group_stages")
    .select("id, name, color, position, group_id")
    .in("id", ["eccba325-458f-4be0-bc8c-b55849400860"]);
  console.log("simple error:", error1);
  console.log("simple data:", JSON.stringify(data1, null, 2));

  // Test 2: join without inner
  const { data: data2, error: error2 } = await supabase
    .from("task_group_stages")
    .select("id, name, color, position, group_id, task_groups(schedule_mode)")
    .in("id", ["eccba325-458f-4be0-bc8c-b55849400860"]);
  console.log("join error:", error2);
  console.log("join data:", JSON.stringify(data2, null, 2));
}

main();
