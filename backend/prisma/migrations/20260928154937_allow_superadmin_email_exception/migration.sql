-- La CHECK de dominio es literal (no puede leer SUPERADMIN_EMAIL de .env),
-- igual que ya lo era ALLOWED_EMAIL_DOMAIN en esta misma restricción. Si
-- SUPERADMIN_EMAIL cambia en el futuro, hay que repetir esta migración.
ALTER TABLE "users" DROP CONSTRAINT "users_email_domain";

ALTER TABLE "users" ADD CONSTRAINT "users_email_domain"
    CHECK ("email" LIKE '%@puntosvuela.es' OR "email" = 'jmespana81@gmail.com');
