-- Owner terminology: "Charging Port" is now "Charging Logic" everywhere.
-- Product slugs deliberately stay stable: already shared/indexed product URLs
-- continue to work while their visible title and category are updated.
UPDATE "Product"
SET
  "name" = replace("name", 'Charging Port', 'Charging Logic'),
  "desc" = replace("desc", 'Charging Port', 'Charging Logic'),
  "category" = CASE
    WHEN "category" = 'Charging Port' THEN 'Charging Logic'
    ELSE "category"
  END,
  "categories" = (
    SELECT COALESCE(
      jsonb_agg(CASE WHEN item = 'Charging Port' THEN 'Charging Logic' ELSE item END),
      '[]'::jsonb
    )
    FROM jsonb_array_elements_text("Product"."categories") AS item
  ),
  "updatedAt" = NOW()
WHERE
  "name" LIKE '%Charging Port%'
  OR "desc" LIKE '%Charging Port%'
  OR "category" = 'Charging Port'
  OR "categories" @> '["Charging Port"]'::jsonb;
