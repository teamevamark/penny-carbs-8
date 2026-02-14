
-- 1. Trigger to update cook total_orders when an order is delivered
CREATE OR REPLACE FUNCTION public.update_cook_total_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process when status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Update total_orders for all cooks assigned to this order via order_items
    UPDATE public.cooks
    SET total_orders = COALESCE(total_orders, 0) + 1,
        updated_at = now()
    WHERE id IN (
      SELECT DISTINCT oi.assigned_cook_id
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id
        AND oi.assigned_cook_id IS NOT NULL
    );

    -- Also update via order_assigned_cooks table
    UPDATE public.cooks
    SET total_orders = COALESCE(total_orders, 0) + 1,
        updated_at = now()
    WHERE id IN (
      SELECT DISTINCT oac.cook_id
      FROM public.order_assigned_cooks oac
      WHERE oac.order_id = NEW.id
        AND oac.cook_id NOT IN (
          SELECT DISTINCT oi.assigned_cook_id
          FROM public.order_items oi
          WHERE oi.order_id = NEW.id
            AND oi.assigned_cook_id IS NOT NULL
        )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_cook_total_orders
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_cook_total_orders();

-- 2. Trigger to update cook average rating when a new rating is inserted/updated
CREATE OR REPLACE FUNCTION public.update_cook_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cook_id UUID;
  v_avg_rating NUMERIC;
BEGIN
  v_cook_id := NEW.cook_id;
  
  IF v_cook_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate average rating for this cook
  SELECT AVG(rating)::NUMERIC(3,2) INTO v_avg_rating
  FROM public.order_ratings
  WHERE cook_id = v_cook_id;

  -- Update the cook's rating
  UPDATE public.cooks
  SET rating = COALESCE(v_avg_rating, 0),
      updated_at = now()
  WHERE id = v_cook_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_cook_rating
AFTER INSERT OR UPDATE ON public.order_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_cook_rating();

-- 3. Backfill: Update total_orders for existing delivered orders
UPDATE public.cooks c
SET total_orders = sub.order_count
FROM (
  SELECT oi.assigned_cook_id AS cook_id, COUNT(DISTINCT oi.order_id) AS order_count
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status = 'delivered'
    AND oi.assigned_cook_id IS NOT NULL
  GROUP BY oi.assigned_cook_id
) sub
WHERE c.id = sub.cook_id;
