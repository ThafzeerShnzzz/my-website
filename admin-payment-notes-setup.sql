-- Run once in Supabase SQL Editor before using Payment Due Date / Note.
-- Admin-only notes; no changes to registration or payment status.
create table if not exists public.okp_admin_payment_notes (
 registration_code text primary key,
 note text not null default '' check (char_length(note) <= 300),
 due_date date,
 updated_at timestamptz not null default now()
);
alter table public.okp_admin_payment_notes enable row level security;
drop policy if exists "okp notes admin select" on public.okp_admin_payment_notes;
drop policy if exists "okp notes admin insert" on public.okp_admin_payment_notes;
drop policy if exists "okp notes admin update" on public.okp_admin_payment_notes;
create policy "okp notes admin select" on public.okp_admin_payment_notes for select to authenticated
 using (auth.uid() in ('56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid));
create policy "okp notes admin insert" on public.okp_admin_payment_notes for insert to authenticated
 with check (auth.uid() in ('56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid));
create policy "okp notes admin update" on public.okp_admin_payment_notes for update to authenticated
 using (auth.uid() in ('56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid))
 with check (auth.uid() in ('56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid));
grant select,insert,update on public.okp_admin_payment_notes to authenticated;
