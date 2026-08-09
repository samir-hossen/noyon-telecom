-- Backs the footer newsletter signup form (POST /api/newsletter). The form
-- already existed on the frontend and was calling this endpoint, but
-- nothing on the backend ever handled it — every signup attempt on every
-- page of the site was silently 404ing. This table plus the new route in
-- newsletter.routes.js fixes that.
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
