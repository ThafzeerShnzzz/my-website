-- Run once in Supabase SQL Editor, then refresh the admin panel.
begin;
create table if not exists public.okp_pay_later (
 registration_code text primary key,
 due_date date not null,
 paid_at timestamptz,
 added_by uuid not null,
 updated_at timestamptz not null default now()
);
alter table public.okp_pay_later enable row level security;
revoke all on public.okp_pay_later from anon,authenticated;
grant select on public.okp_pay_later to authenticated;
drop policy if exists okp_admin_read_pay_later on public.okp_pay_later;
create policy okp_admin_read_pay_later on public.okp_pay_later for select to authenticated
using (auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid,'56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid));
create or replace function public.admin_set_okp_pay_later(p_code text,p_due_date date default null,p_mark_paid boolean default false)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_status text;
begin
 if auth.uid() is null or auth.uid() not in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid,'56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid)
 then raise exception 'Admin access required' using errcode='42501'; end if;
 select "Payment status" into v_status from public.registrations where registration_code=p_code for update;
 if not found then raise exception 'Registration not found'; end if;
 if exists(select 1 from public.okp_complimentary_guests where registration_code=p_code) then raise exception 'FOC guests do not require payment'; end if;
 if p_mark_paid then
  if v_status <> 'approved' then raise exception 'Only confirmed guests can be marked paid'; end if;
  update public.okp_pay_later set paid_at=now(),updated_at=now() where registration_code=p_code and paid_at is null;
  if not found then raise exception 'No outstanding Pay Later balance found. Refresh the guest list.'; end if;
 else
  if p_due_date is null then raise exception 'Choose a payment due date'; end if;
  insert into public.okp_pay_later(registration_code,due_date,added_by)
  values(p_code,p_due_date,auth.uid())
  on conflict(registration_code) do update set due_date=excluded.due_date,paid_at=null,added_by=auth.uid(),updated_at=now();
  update public.registrations set "Payment status"='approved' where registration_code=p_code;
 end if;
end $$;
revoke all on function public.admin_set_okp_pay_later(text,date,boolean) from public,anon;
grant execute on function public.admin_set_okp_pay_later(text,date,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
