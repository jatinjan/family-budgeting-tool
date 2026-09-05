-- V2 sync coordinator timestamp contract.
-- All last-write-wins tables need a server-visible modification timestamp.

ALTER TABLE public.adults
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.set_budget_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS adults_set_budget_updated_at ON public.adults;
CREATE TRIGGER adults_set_budget_updated_at
BEFORE UPDATE ON public.adults
FOR EACH ROW EXECUTE FUNCTION public.set_budget_updated_at();

DROP TRIGGER IF EXISTS children_set_budget_updated_at ON public.children;
CREATE TRIGGER children_set_budget_updated_at
BEFORE UPDATE ON public.children
FOR EACH ROW EXECUTE FUNCTION public.set_budget_updated_at();

DROP TRIGGER IF EXISTS categories_set_budget_updated_at ON public.categories;
CREATE TRIGGER categories_set_budget_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_budget_updated_at();

DROP TRIGGER IF EXISTS households_set_budget_updated_at ON public.households;
CREATE TRIGGER households_set_budget_updated_at
BEFORE UPDATE ON public.households
FOR EACH ROW EXECUTE FUNCTION public.set_budget_updated_at();

DROP TRIGGER IF EXISTS expense_items_set_budget_updated_at ON public.expense_items;
CREATE TRIGGER expense_items_set_budget_updated_at
BEFORE UPDATE ON public.expense_items
FOR EACH ROW EXECUTE FUNCTION public.set_budget_updated_at();

NOTIFY pgrst, 'reload schema';
