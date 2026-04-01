-- Gage Screenshots table for OCR priority capture
create table if not exists gage_screenshots (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  extracted_text text not null default '',
  edited_text text not null default '',
  description text not null default '',
  date_label text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table gage_screenshots enable row level security;

-- Allow all operations (single-user dashboard)
create policy "Allow all access to gage_screenshots"
  on gage_screenshots for all
  using (true)
  with check (true);

-- Storage bucket for screenshot images
insert into storage.buckets (id, name, public)
values ('gage-screenshots', 'gage-screenshots', true)
on conflict (id) do nothing;

-- Allow public read/write on the bucket (single-user dashboard)
create policy "Allow public upload to gage-screenshots"
  on storage.objects for insert
  with check (bucket_id = 'gage-screenshots');

create policy "Allow public read from gage-screenshots"
  on storage.objects for select
  using (bucket_id = 'gage-screenshots');

create policy "Allow public delete from gage-screenshots"
  on storage.objects for delete
  using (bucket_id = 'gage-screenshots');
