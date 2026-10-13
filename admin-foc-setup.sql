-- Run once in Supabase SQL Editor. Existing public RSVP and lookup functions are unchanged.
begin;
create table if not exists public.okp_complimentary_guests (
 registration_code text primary key,
 added_by uuid not null,
 added_at timestamptz not null default now()
);
alter table public.okp_complimentary_guests enable row level security;
revoke all on public.okp_complimentary_guests from anon, authenticated;
grant select on public.okp_complimentary_guests to authenticated;
drop policy if exists okp_admin_read_complimentary on public.okp_complimentary_guests;
create policy okp_admin_read_complimentary on public.okp_complimentary_guests
for select to authenticated using (auth.uid() in (
'465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,
'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid,
'56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid));

create or replace function public.admin_add_okp_foc_guest(
 p_name text, p_whatsapp text, p_preferred_family text,
 p_new_to_community text, p_heard_about_us text, p_care_of text
) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v_code text;
begin
 if auth.uid() is null or auth.uid() not in (
 '465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,
 'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid,
 '56a26c25-1876-4cf3-8884-39e5ec34517d'::uuid
 ) then raise exception 'Admin access required' using errcode='42501'; end if;
 if coalesce(trim(p_name),'')='' or coalesce(p_whatsapp,'') !~ '^\+9715[0-9]{8}$'
 or coalesce(p_preferred_family,'') not in ('Bride''s Family','Groom''s Family','Any')
 or coalesce(p_new_to_community,'') not in ('Yes','No')
 then raise exception 'Enter valid guest details'; end if;
 -- Serialize admin submissions for the same phone; do not modify an existing guest.
 perform pg_advisory_xact_lock(hashtext(p_whatsapp));
 if exists(select 1 from public.registrations where regexp_replace("Whatsapp",'[^0-9]','','g') in
 (regexp_replace(p_whatsapp,'[^0-9]','','g'),'0'||substring(p_whatsapp from 5)))
 then raise exception 'This WhatsApp number is already registered'; end if;
 -- Reuse the live RSVP function so the existing OKP numbering remains authoritative.
 -- Temporary neutral values satisfy required payment fields; they are cleared in this transaction.
 select public.submit_okp_rsvp(
 p_name:=trim(p_name),p_whatsapp:=p_whatsapp,p_preferred_family:=p_preferred_family,
 p_new_to_community:=p_new_to_community,p_heard_about_us:=p_heard_about_us,
 p_care_of:=coalesce(trim(p_care_of),''),p_payment_reference:='Admin invitation',
 p_payment_proof:='admin-invitation'
 ) into v_code;
 if v_code is null or v_code='' then raise exception 'Registration code was not returned'; end if;
 update public.registrations set "Payment status"='approved',payment_reference='',payment_proof=''
 where registration_code=v_code;
 if not found then raise exception 'New registration was not found'; end if;
 insert into public.okp_complimentary_guests(registration_code,added_by) values(v_code,auth.uid());
 return v_code;
end $$;
revoke all on function public.admin_add_okp_foc_guest(text,text,text,text,text,text) from public,anon;
grant execute on function public.admin_add_okp_foc_guest(text,text,text,text,text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
