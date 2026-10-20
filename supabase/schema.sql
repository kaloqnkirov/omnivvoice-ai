-- OmniVoice AI — run in Supabase SQL editor once
-- Enables auth profiles, rooms, realtime chat, invites, guests

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  display_name text not null default '',
  phone text not null default '',
  avatar_url text not null default '',
  native_language text not null default 'bg',
  company text not null default '',
  plan text not null default 'free' check (plan in ('free', 'business', 'podcast')),
  plan_paid boolean not null default false,
  is_admin boolean not null default false,
  secretary_enabled boolean not null default false,
  secretary_phone text not null default '',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Conversation',
  session_open boolean not null default true,
  livekit_room text not null default '',
  channel text not null default 'both' check (channel in ('chat', 'call', 'both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  guest_id text,
  display_name text not null,
  language text not null default 'bg',
  role text not null default 'member' check (role in ('host', 'member', 'guest')),
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

create index if not exists room_participants_room_idx on public.room_participants (room_id);
create index if not exists room_participants_guest_idx on public.room_participants (guest_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  sender_user_id uuid references public.profiles (id) on delete set null,
  sender_guest_id text,
  sender_name text not null default '',
  body text not null,
  translated_body text,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_created_idx on public.messages (room_id, created_at);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  room_id uuid not null references public.rooms (id) on delete cascade,
  host_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default 'Guest invite',
  channel text not null default 'both' check (channel in ('chat', 'call', 'both')),
  prefill_name text,
  prefill_language text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists invites_code_idx on public.invites (code);

create table if not exists public.site_widgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  site_key text not null unique,
  domain text not null default '',
  room_id uuid references public.rooms (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_emails text[] := array[
    'admin@omnivvoice.app',
    'admin@omnivoice.ai',
    'aiassistantbox@gmail.com',
    'kaloyan@omnivvoice.app'
  ];
  meta_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  meta_plan text := coalesce(new.raw_user_meta_data->>'plan', 'free');
  is_admin boolean := lower(new.email) = any (select lower(unnest(admin_emails)));
begin
  insert into public.profiles (
    id, email, full_name, display_name, plan, plan_paid, is_admin, native_language
  ) values (
    new.id,
    new.email,
    meta_name,
    split_part(meta_name, ' ', 1),
    case when meta_plan in ('free', 'business', 'podcast') then meta_plan else 'free' end,
    is_admin or meta_plan = 'free',
    is_admin,
    coalesce(new.raw_user_meta_data->>'native_language', 'bg')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.messages enable row level security;
alter table public.invites enable row level security;
alter table public.site_widgets enable row level security;

-- Profiles
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id or is_admin = true);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Rooms: host full access; participants can read
create policy "rooms_select" on public.rooms
  for select using (
    host_id = auth.uid()
    or exists (
      select 1 from public.room_participants p
      where p.room_id = rooms.id and p.user_id = auth.uid() and p.is_active
    )
  );
create policy "rooms_insert_host" on public.rooms
  for insert with check (host_id = auth.uid());
create policy "rooms_update_host" on public.rooms
  for update using (host_id = auth.uid());

-- Participants
create policy "participants_select" on public.room_participants
  for select using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and (
        r.host_id = auth.uid()
        or exists (
          select 1 from public.room_participants p2
          where p2.room_id = r.id and p2.user_id = auth.uid()
        )
      )
    )
  );
create policy "participants_insert_host" on public.room_participants
  for insert with check (
    exists (select 1 from public.rooms r where r.id = room_id and r.host_id = auth.uid())
  );
create policy "participants_update_host" on public.room_participants
  for update using (
    exists (select 1 from public.rooms r where r.id = room_id and r.host_id = auth.uid())
  );

-- Messages
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and (
        r.host_id = auth.uid()
        or exists (
          select 1 from public.room_participants p
          where p.room_id = r.id and p.user_id = auth.uid() and p.is_active
        )
      )
    )
  );
create policy "messages_insert" on public.messages
  for insert with check (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.session_open = true and (
        r.host_id = auth.uid()
        or exists (
          select 1 from public.room_participants p
          where p.room_id = r.id and p.user_id = auth.uid() and p.is_active
        )
      )
    )
  );

-- Invites
create policy "invites_select_host" on public.invites
  for select using (host_id = auth.uid());
create policy "invites_insert_host" on public.invites
  for insert with check (host_id = auth.uid());
create policy "invites_update_host" on public.invites
  for update using (host_id = auth.uid());

-- Widgets
create policy "widgets_all_own" on public.site_widgets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_participants;
