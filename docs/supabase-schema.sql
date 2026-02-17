-- Run this in Supabase SQL editor

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text not null default 'User',
  department text not null default 'General',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.project_snapshots (
  project_id uuid primary key references public.projects(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_snapshots enable row level security;

-- profiles
create policy if not exists profiles_select_self_or_member
on public.profiles for select
using (
  auth.uid() = id
  or exists (
    select 1
    from public.project_members pm_self
    join public.project_members pm_other on pm_other.project_id = pm_self.project_id
    where pm_self.user_id = auth.uid()
      and pm_other.user_id = profiles.id
  )
);

create policy if not exists profiles_insert_self
on public.profiles for insert
with check (auth.uid() = id);

create policy if not exists profiles_update_self
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- projects
create policy if not exists projects_select_member
on public.projects for select
using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = projects.id and pm.user_id = auth.uid()
  )
);

create policy if not exists projects_insert_owner
on public.projects for insert
with check (auth.uid() = owner_id);

create policy if not exists projects_update_owner
on public.projects for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy if not exists projects_delete_owner
on public.projects for delete
using (owner_id = auth.uid());

-- project_members
create policy if not exists members_select_member
on public.project_members for select
using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id and pm.user_id = auth.uid()
  )
);

create policy if not exists members_insert_owner
on public.project_members for insert
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_members.project_id and p.owner_id = auth.uid()
  )
);

create policy if not exists members_update_owner
on public.project_members for update
using (
  exists (
    select 1 from public.projects p
    where p.id = project_members.project_id and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_members.project_id and p.owner_id = auth.uid()
  )
);

create policy if not exists members_delete_owner
on public.project_members for delete
using (
  exists (
    select 1 from public.projects p
    where p.id = project_members.project_id and p.owner_id = auth.uid()
  )
);

-- project_snapshots
create policy if not exists snapshots_select_member
on public.project_snapshots for select
using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = project_snapshots.project_id and pm.user_id = auth.uid()
  )
);

create policy if not exists snapshots_upsert_member
on public.project_snapshots for insert
with check (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = project_snapshots.project_id and pm.user_id = auth.uid()
  )
);

create policy if not exists snapshots_update_member
on public.project_snapshots for update
using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = project_snapshots.project_id and pm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = project_snapshots.project_id and pm.user_id = auth.uid()
  )
);
