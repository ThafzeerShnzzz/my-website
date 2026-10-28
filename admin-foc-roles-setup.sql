-- One-time setup for admin-only FOC role labels. Does not modify FOC flags.
create table if not exists public.okp_admin_foc_roles (
 registration_code text primary key,
 role text not null check (char_length(role) between 1 and 100),
 updated_at timestamptz not null default now()
);
alter table public.okp_admin_foc_roles enable row level security;
drop policy if exists "okp foc role select" on public.okp_admin_foc_roles;
drop policy if exists "okp foc role insert" on public.okp_admin_foc_roles;
drop policy if exists "okp foc role update" on public.okp_admin_foc_roles;
create policy "okp foc role select" on public.okp_admin_foc_roles for select to authenticated using (auth.uid() in ('56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid));
create policy "okp foc role insert" on public.okp_admin_foc_roles for insert to authenticated with check (auth.uid() in ('56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid));
create policy "okp foc role update" on public.okp_admin_foc_roles for update to authenticated using (auth.uid() in ('56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid)) with check (auth.uid() in ('56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid));
grant select,insert,update on public.okp_admin_foc_roles to authenticated;