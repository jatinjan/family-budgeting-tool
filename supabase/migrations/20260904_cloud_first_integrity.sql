-- Cloud-first budget integrity contract.
-- Enforce parent ownership in PostgreSQL; client validation is not a boundary.

CREATE OR REPLACE FUNCTION public.validate_category_parent_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.entity_type = 'child' AND NOT EXISTS (
    SELECT 1 FROM public.children
    WHERE id = NEW.entity_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Category child parent does not belong to user'
      USING ERRCODE = '23503';
  ELSIF NEW.entity_type = 'adult' AND NOT EXISTS (
    SELECT 1 FROM public.adults
    WHERE id = NEW.entity_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Category adult parent does not belong to user'
      USING ERRCODE = '23503';
  ELSIF NEW.entity_type = 'household' AND NOT EXISTS (
    SELECT 1 FROM public.households
    WHERE id = NEW.entity_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Category household parent does not belong to user'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categories_validate_parent_owner ON public.categories;
CREATE TRIGGER categories_validate_parent_owner
BEFORE INSERT OR UPDATE OF user_id, entity_type, entity_id
ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.validate_category_parent_owner();

CREATE OR REPLACE FUNCTION public.validate_expense_item_parent_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = NEW.category_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Expense item category does not belong to user'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS expense_items_validate_parent_owner ON public.expense_items;
CREATE TRIGGER expense_items_validate_parent_owner
BEFORE INSERT OR UPDATE OF user_id, category_id
ON public.expense_items
FOR EACH ROW EXECUTE FUNCTION public.validate_expense_item_parent_owner();

-- Make write ownership explicit even if older policies were created without
-- a WITH CHECK clause.
DROP POLICY IF EXISTS "Users can manage own household" ON public.households;
CREATE POLICY "Users can manage own household"
  ON public.households FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own adults" ON public.adults;
CREATE POLICY "Users can manage own adults"
  ON public.adults FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own children" ON public.children;
CREATE POLICY "Users can manage own children"
  ON public.children FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
CREATE POLICY "Users can manage own categories"
  ON public.categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own expense items" ON public.expense_items;
CREATE POLICY "Users can manage own expense items"
  ON public.expense_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
