begin;

create table public.okp_staycation_poll_responses (
  id uuid primary key,
  submitted_at timestamptz not null default now(),
  answers jsonb not null,
  ratings jsonb not null,
  respondent_name text,
  suggestion text not null
);

alter table public.okp_staycation_poll_responses enable row level security;
revoke all on public.okp_staycation_poll_responses from anon, authenticated;

create function public.submit_okp_staycation_poll(
  submission_id uuid,
  poll_answers jsonb,
  poll_ratings jsonb,
  poll_suggestion text,
  poll_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if submission_id is null
      or jsonb_typeof(poll_answers) is distinct from 'object'
      or jsonb_typeof(poll_ratings) is distinct from 'object'
      or char_length(poll_name) > 100
      or poll_suggestion is null
      or char_length(poll_suggestion) > 2000
      or octet_length(poll_answers::text) > 20000
      or octet_length(poll_ratings::text) > 500 then
    raise exception 'Invalid poll response';
  end if;

  if (select count(*) from jsonb_each(poll_answers)) > 25
      or exists (
        select 1 from jsonb_each(poll_answers) as answer(key, value)
        where case
          when key ~ '^fun-(sangeeth-[1-8]|foam-[1-4]|pool-[1-5])$' then
            jsonb_typeof(value) <> 'string'
            or char_length(value #>> '{}') not between 1 and 240
          when key in ('staycation', 'expectations', 'favorite-event', 'biggest-surprise',
                       'favorite-meal', 'breakfast-pick', 'more-time', 'sound-lighting') then
            value::text !~ '^[1-6]$'
          else true
        end
      )
      or exists (
        select 1 from jsonb_each(poll_ratings) as rating(key, value)
        where key not in ('staycation', 'villa', 'decorations', 'dinner', 'breakfast', 'vibe', 'dj', 'expectation')
           or value::text !~ '^[1-5]$'
      )
      or (poll_answers = '{}'::jsonb and poll_ratings = '{}'::jsonb and btrim(poll_suggestion) = '') then
    raise exception 'Invalid poll response';
  end if;

  insert into public.okp_staycation_poll_responses (id, answers, ratings, suggestion, respondent_name)
  values (submission_id, poll_answers, poll_ratings, poll_suggestion, nullif(btrim(poll_name), ''))
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.submit_okp_staycation_poll(uuid, jsonb, jsonb, text, text) from public;
grant execute on function public.submit_okp_staycation_poll(uuid, jsonb, jsonb, text, text) to anon, authenticated;

commit;
