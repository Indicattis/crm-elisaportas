import { supabase } from "@/integrations/supabase/client";

export async function createNotification(params: {
  userId: string;
  dealId?: string;
  type: string;
  title: string;
  message: string;
  currentUserId?: string;
}) {
  // Don't notify yourself
  if (params.currentUserId && params.currentUserId === params.userId) return;

  await (supabase.from("notifications") as any).insert({
    user_id: params.userId,
    deal_id: params.dealId || null,
    type: params.type,
    title: params.title,
    message: params.message,
  });
}
