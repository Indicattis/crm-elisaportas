import { supabase } from "@/integrations/supabase/client";

export async function createNotification(params: {
  userId: string;
  dealId?: string;
  type: string;
  title: string;
  message: string;
}) {
  // Don't notify yourself
  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.id === params.userId) return;

  await supabase.from("notifications").insert({
    user_id: params.userId,
    deal_id: params.dealId || null,
    type: params.type,
    title: params.title,
    message: params.message,
  } as any);
}
