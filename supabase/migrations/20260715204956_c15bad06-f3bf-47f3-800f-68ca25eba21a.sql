REVOKE ALL ON FUNCTION public.mark_deal_as_sold(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_deal_as_sold(uuid, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_deal_as_sold(uuid, timestamptz) TO authenticated;