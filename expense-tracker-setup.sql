-- O.K.P expense register. Run once in Supabase SQL Editor.
begin;
create table if not exists public.okp_expenses(
 id bigint generated always as identity primary key,
 expense_date date not null default current_date,
 category text not null check(category in ('Venue','Food & Drinks','DJ & Sound','Decoration','Pool & Foam','Transport','Marketing','Other')),
 description text not null check(char_length(trim(description)) between 1 and 300),
 amount numeric(12,2) not null check(amount>0),
 paid_via text not null check(paid_via in ('Cash','Bank Transfer','Ziina','Other')),
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now()
);
alter table public.okp_expenses enable row level security;
revoke all on public.okp_expenses from anon,authenticated;
grant select,insert,delete on public.okp_expenses to authenticated;
drop policy if exists okp_expenses_admin_select on public.okp_expenses;
drop policy if exists okp_expenses_admin_insert on public.okp_expenses;
drop policy if exists okp_expenses_admin_delete on public.okp_expenses;
create policy okp_expenses_admin_select on public.okp_expenses for select to authenticated
 using(auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid,'56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid));
create policy okp_expenses_admin_insert on public.okp_expenses for insert to authenticated
 with check(auth.uid()=created_by and auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid,'56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid));
create policy okp_expenses_admin_delete on public.okp_expenses for delete to authenticated
 using(auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid,'56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid));
notify pgrst,'reload schema';
commit;