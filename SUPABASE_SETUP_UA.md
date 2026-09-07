# Підключення Supabase до DiplomovaDilna CRM

1. Створи безкоштовний проєкт у Supabase.
2. Відкрий **SQL Editor**, встав увесь вміст `supabase-schema.sql` і натисни **Run**.
3. Відкрий **Connect** у проєкті Supabase або **Settings → API Keys**.
4. Скопіюй:
   - **Project URL** (`https://....supabase.co`)
   - **Publishable key** (або legacy `anon` key).
5. Відкрий хмарну CRM: `https://plozyak.github.io/DpPomoc/cloud.html`.
6. Встав Project URL і key → **Зберегти й підключити**.
7. Створи акаунт у CRM через email/пароль. Якщо Supabase просить підтвердження email — підтвердь лист і потім увійди.
8. На iPhone відкрий ту саму CRM і увійди тим самим email/паролем.

## Безпека

Publishable/anon key є клієнтським ключем. Дані захищені Row Level Security: користувач бачить лише рядок, де `user_id = auth.uid()`.

**Не використовуй `service_role` key у браузері чи GitHub.**
