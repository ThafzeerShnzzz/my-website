-- Run once in the existing Supabase project's SQL Editor.
begin;
create table if not exists public.okp_memory_access (
 token uuid primary key default gen_random_uuid(),
 registration_code text not null,
 created_at timestamptz not null default now()
);
alter table public.okp_memory_access enable row level security;
revoke all on public.okp_memory_access from anon, authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('memory-pending','memory-pending',false,3145728,array['image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=3145728,allowed_mime_types=array['image/jpeg'];
create or replace function public.unlock_okp_memories(p_code text,p_answer integer)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_code text; v_token uuid;
begin
 v_code:=upper(regexp_replace(trim(p_code),'[^a-zA-Z0-9]','','g'));
 if p_answer is distinct from 4 or not exists(
 select 1 from public.registrations where upper(regexp_replace(registration_code,'[^a-zA-Z0-9]','','g'))=v_code and "Payment status"='approved'
 ) then raise exception 'Check your OKP number and foam party answer.'; end if;
 perform pg_advisory_xact_lock(hashtext(v_code));
 if (select count(*) from public.okp_memory_access where registration_code=v_code and created_at>now()-interval '1 day')>=5 then
 raise exception 'Daily upload access limit reached. Please contact ISTEDA.'; end if;
 insert into public.okp_memory_access(registration_code) values(v_code) returning token into v_token;
 return v_token;
end $$;
revoke all on function public.unlock_okp_memories(text,integer) from public;
grant execute on function public.unlock_okp_memories(text,integer) to anon,authenticated;
create or replace function public.okp_memory_upload_allowed(p_name text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_token text:=split_part(p_name,'/',1);
begin
 perform pg_advisory_xact_lock(hashtext(v_token));
 return p_name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}__[a-zA-Z0-9 _-]{0,80}[.]jpg$'
 and exists(select 1 from public.okp_memory_access where token::text=v_token and created_at>now()-interval '1 hour')
 and (select count(*) from storage.objects where bucket_id='memory-pending' and split_part(name,'/',1)=v_token)<10;
end $$;
revoke all on function public.okp_memory_upload_allowed(text) from public;
grant execute on function public.okp_memory_upload_allowed(text) to anon,authenticated;
drop policy if exists "Guest memory upload" on storage.objects;
create policy "Guest memory upload" on storage.objects for insert to anon,authenticated
with check(bucket_id='memory-pending' and public.okp_memory_upload_allowed(name));
drop policy if exists "Memory pending admin read" on storage.objects;
create policy "Memory pending admin read" on storage.objects for select to authenticated
using(bucket_id='memory-pending' and auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid));
drop policy if exists "Memory pending admin delete" on storage.objects;
create policy "Memory pending admin delete" on storage.objects for delete to authenticated
using(bucket_id='memory-pending' and auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid));
commit;
