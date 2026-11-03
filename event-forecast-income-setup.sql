-- Run once in Supabase SQL Editor to enable forecast sponsorship and other income.
-- Planning entries are independent from actual payment collections and cash flow.
begin;
create table if not exists public.okp_estimated_income (
 id bigint generated always as identity primary key,
 income_type text not null check (income_type in ('sponsorship','other')),
 purpose text not null check (char_length(trim(purpose)) between 1 and 150),
 amount numeric(12,2) not null check (amount > 0),
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now()
);
alter table public.okp_estimated_income enable row level security;
revoke all on public.okp_estimated_income from anon,authenticated;
grant select,insert,update,delete on public.okp_estimated_income to authenticated;
drop policy if exists okp_estimated_income_admin_all on public.okp_estimated_income;
create policy okp_estimated_income_admin_all on public.okp_estimated_income
 for all to authenticated
 using (auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid,'56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid))
 with check (auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid,'56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid));
notify pgrst,'reload schema';
commit;
