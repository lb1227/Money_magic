-- Run in Supabase SQL editor

create table if not exists public.user_datasets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dataset_id text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_datasets enable row level security;

create policy "Users can read own dataset mapping"
  on public.user_datasets
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own dataset mapping"
  on public.user_datasets
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own dataset mapping"
  on public.user_datasets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_user_datasets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_datasets_updated_at on public.user_datasets;
create trigger touch_user_datasets_updated_at
before update on public.user_datasets
for each row execute function public.touch_user_datasets_updated_at();
