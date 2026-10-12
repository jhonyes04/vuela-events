UPDATE "users" SET "isSuperadmin" = true WHERE email NOT LIKE '%@puntosvuela.es';

ALTER TABLE "users" ADD CONSTRAINT "users_email_domain_check"
    CHECK (email LIKE '%@puntosvuela.es' OR "isSuperadmin" = true);