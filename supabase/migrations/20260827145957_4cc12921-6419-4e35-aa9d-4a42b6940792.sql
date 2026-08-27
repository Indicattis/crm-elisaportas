ALTER TABLE public.crm_monitoring REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_monitoring;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;