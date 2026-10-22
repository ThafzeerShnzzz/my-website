-- Run once in Supabase SQL Editor, then refresh the admin panel.
begin;
create table if not exists public.okp_team_assignments(
 registration_code text primary key,
 team text not null check(team in ('bride','groom','other')),
 assigned_by uuid not null,
 updated_at timestamptz not null default now()
);
alter table public.okp_team_assignments enable row level security;
revoke all on public.okp_team_assignments from anon,authenticated;
grant select on public.okp_team_assignments to authenticated;
drop policy if exists okp_admin_read_teams on public.okp_team_assignments;
create policy okp_admin_read_teams on public.okp_team_assignments for select to authenticated
using(auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid,'56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid));
create or replace function public.admin_set_okp_team(p_code text,p_team text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or auth.uid() not in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid,'56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid)
 then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_team is null or p_team not in ('bride','groom','other','unassigned') then raise exception 'Choose Bride, Groom, Other or Unassigned'; end if;
 perform 1 from public.registrations where registration_code=p_code for update;
 if not found then raise exception 'Registration not found'; end if;
 if p_team='unassigned' then
  delete from public.okp_team_assignments where registration_code=p_code;
 else
  insert into public.okp_team_assignments(registration_code,team,assigned_by)
  values(p_code,p_team,auth.uid())
  on conflict(registration_code) do update set team=excluded.team,assigned_by=auth.uid(),updated_at=now();
 end if;
end $$;
revoke all on function public.admin_set_okp_team(text,text) from public,anon;
grant execute on function public.admin_set_okp_team(text,text) to authenticated;
notify pgrst,'reload schema';
commit;
