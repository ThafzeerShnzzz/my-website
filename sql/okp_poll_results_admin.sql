begin;

alter table public.okp_staycation_poll_responses enable row level security;
revoke all on public.okp_staycation_poll_responses from anon, authenticated;
grant select on public.okp_staycation_poll_responses to authenticated;

drop policy if exists "OKP admins can read poll responses" on public.okp_staycation_poll_responses;
drop policy if exists "Only OKP admins can read poll responses" on public.okp_staycation_poll_responses;
create policy "OKP admins can read poll responses"
  on public.okp_staycation_poll_responses for select to authenticated
  using (auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874','edd5746f-c472-4e01-8fa8-cf62adaeaeed'));
create policy "Only OKP admins can read poll responses"
  on public.okp_staycation_poll_responses as restrictive for select to authenticated
  using (auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874','edd5746f-c472-4e01-8fa8-cf62adaeaeed'));

commit;
