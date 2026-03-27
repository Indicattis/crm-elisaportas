-- Add column without default first
ALTER TABLE public.deals ADD COLUMN deal_number integer UNIQUE;

-- Create sequence
CREATE SEQUENCE public.deals_deal_number_seq START 1;

-- Backfill existing deals
UPDATE public.deals SET deal_number = sub.rn
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn FROM public.deals) sub
WHERE deals.id = sub.id;

-- Set sequence to continue after max
SELECT setval('public.deals_deal_number_seq', COALESCE((SELECT MAX(deal_number) FROM public.deals), 0));

-- Now set the default for future inserts
ALTER TABLE public.deals ALTER COLUMN deal_number SET DEFAULT nextval('public.deals_deal_number_seq');