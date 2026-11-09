-- Keep the shortened Motorola G85 display URL working via the existing 301 handler.
INSERT INTO "ProductSlugRedirect" ("slug", "productId")
SELECT 'motorola-g85-display', target."id"
FROM "Product" AS target
WHERE target."slug" = 'motorola-moto-g85-display'
  AND target."published" = true
  AND NOT EXISTS (
    SELECT 1
    FROM "Product" AS existing
    WHERE existing."slug" = 'motorola-g85-display'
       OR existing."id" = 'motorola-g85-display'
  )
ON CONFLICT ("slug") DO NOTHING;
