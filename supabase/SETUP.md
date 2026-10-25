# Supabase setup

1. In the Supabase SQL Editor, paste and run [`setup.sql`](setup.sql). It combines the migrations below, creates `public.profiles` and the dashboard tables, backfills existing Auth users, promotes the earliest account to active admin when needed, and asks the API schema cache to reload. You can instead run the individual files in `migrations/` in timestamp order. The dashboard migration creates accounts, orders, calculation rules, access policies, and dashboard aggregates.
2. In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` to the redirect URL allow list (and add your deployed callback URL later).
3. In **Authentication → Providers → Google**, enable Google and enter the OAuth client ID and secret from Google Cloud. Add the Supabase callback URL shown in that provider setup to the Google OAuth client's authorized redirect URIs.
4. Copy `.env.example` to `.env.local` and set the project's publishable key if it differs. Add the project's **service role key** to `SUPABASE_SERVICE_ROLE_KEY` to enable username sign-in, Auth bans, and permanent user deletion. This key must remain server-only; never prefix it with `NEXT_PUBLIC_`.
5. Start the app with `pnpm dev`. The first successfully created Auth user receives the active `admin` role. Every later user is created as pending with the `viewer` role. An active administrator approves new accounts at `/admin/users`, then can assign a manager role, account, and sales target at `/sales-managers`. Approved viewers can read workspace data but cannot make changes.

The profile trigger uses a transaction lock so two simultaneous first signups cannot both become administrators. Profile data is protected with row-level security; users can read their own profile, while active administrators can review the team and update non-admin roles/statuses. Active viewers can read workspace information, while only active administrators and sales managers can write workspace data. Sales managers can create orders only for their own linked manager profile and assigned account. Banned profiles cannot read or change workspace data. The manager assignment migration links an approved profile to its sales target; deleting an Auth user cascades that profile and unassigns historical orders from the deleted manager.

To inspect the bootstrap result in the Supabase SQL Editor, run:

```sql
select email, role, status, created_at
from public.profiles
order by created_at, id;
```

The earliest account should be the active administrator. Since the setup SQL backfills Auth users already present in the project, the first user who signed up before applying the schema will be promoted too. Reload the app after the SQL finishes; if the API still reports a missing table, wait briefly and refresh the page. The dashboard counts all non-cancelled orders, but sales and net revenue use real orders only. Order amounts are stored as cents; fee and payout calculations are rounded per order in Postgres.
