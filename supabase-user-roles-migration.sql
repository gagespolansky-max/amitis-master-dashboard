-- Run this in Supabase dashboard → SQL Editor → New Query.
-- Adds per-user role gating: 'admin' sees everything, 'teammate' sees only ACIO.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'teammate');
  end if;
end $$;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role user_role not null default 'teammate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_roles_email_idx on public.user_roles(email);

-- On new user signup: auto-attach to a pre-seeded row by email, else create a default teammate row.
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_roles
     set user_id = new.id,
         updated_at = now()
   where email = new.email
     and (user_id is null or user_id = new.id);

  insert into public.user_roles (user_id, email, role)
  values (new.id, new.email, 'teammate')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute function public.handle_new_user_role();

-- RLS: service-role only. Matches existing master-dashboard pattern.
alter table public.user_roles enable row level security;

-- Seed Gage as admin.
insert into public.user_roles (user_id, email, role)
select id, email, 'admin'::user_role
  from auth.users
 where email = 'gspolansky@amitiscapital.com'
on conflict (user_id) do update set role = 'admin', updated_at = now();
