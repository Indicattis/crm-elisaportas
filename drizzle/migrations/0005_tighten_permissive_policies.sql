CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) $$;

ALTER POLICY "Authenticated can view channels" ON public.acquisition_channels USING (public.is_team_member(auth.uid()));
ALTER POLICY "Authenticated can view lead_flows" ON public.lead_flows USING (public.is_team_member(auth.uid()));
ALTER POLICY "Authenticated can view task_group_stages" ON public.task_group_stages USING (public.is_team_member(auth.uid()));
ALTER POLICY "Authenticated can view task_group_schedules" ON public.task_group_schedules USING (public.is_team_member(auth.uid()));
ALTER POLICY "Authenticated can view shared notes" ON public.shared_notes USING (public.is_team_member(auth.uid()));
ALTER POLICY "Anyone authenticated can view company revenue" ON public.company_revenue USING (public.is_team_member(auth.uid()));
ALTER POLICY "Contact lists readable" ON public.contact_lists USING (public.is_team_member(auth.uid()));
ALTER POLICY "Authenticated users can view all profiles" ON public.profiles USING (id = auth.uid() OR public.is_team_member(auth.uid()));
ALTER POLICY "Authenticated can insert notifications" ON public.notifications WITH CHECK (public.is_team_member(auth.uid()));
ALTER POLICY "Authenticated can insert snapshots" ON public.column_daily_snapshots WITH CHECK (public.is_team_member(auth.uid()));
ALTER POLICY "Authenticated users can update deal_daily_color" ON public.deal_daily_color
  USING (public.can_access_deal(auth.uid(), deal_id))
  WITH CHECK (public.can_access_deal(auth.uid(), deal_id) AND updated_by = auth.uid());
ALTER POLICY "Authenticated can delete planning clients" ON public.sales_planning_clients
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR seller_id = auth.uid() OR created_by = auth.uid());
ALTER POLICY "Authenticated users can delete from deal-attachments" ON storage.objects
  USING (bucket_id = 'deal-attachments' AND (owner_id = (auth.uid())::text OR public.has_role(auth.uid(), 'admin'::app_role)));