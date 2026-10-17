-- Run once in the existing project's Supabase SQL Editor.
-- This creates a separate photo bucket; registration data is not modified.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-album','memory-album',true,3145728,array['image/jpeg'])
on conflict (id) do update set public=true, file_size_limit=3145728, allowed_mime_types=array['image/jpeg'];
drop policy if exists "Memory album public read" on storage.objects;
create policy "Memory album public read" on storage.objects for select to anon, authenticated
using (bucket_id='memory-album');
drop policy if exists "Memory album admin upload" on storage.objects;
create policy "Memory album admin upload" on storage.objects for insert to authenticated
with check (bucket_id='memory-album' and (storage.foldername(name))[1]='photos' and auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid));
drop policy if exists "Memory album admin delete" on storage.objects;
create policy "Memory album admin delete" on storage.objects for delete to authenticated
using (bucket_id='memory-album' and auth.uid() in ('465f75b4-9e4d-4f41-9fd7-37aa91175874'::uuid,'edd5746f-c472-4e01-8fa8-cf62adaeaeed'::uuid));
commit;
