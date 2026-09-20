-- Esquema inicial de Recetario: tabla `recetas`, RLS y bucket de imágenes.

create extension if not exists "pgcrypto";

create table if not exists public.recetas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text,
  texto_crudo text not null,
  imagenes text[] not null default '{}',
  fuente_plataforma text not null default 'manual'
    check (fuente_plataforma in ('instagram', 'facebook', 'youtube', 'whatsapp', 'web', 'manual')),
  fuente_url text,
  etiquetas text[] not null default '{}',
  notas_personales text,
  fecha_captura timestamptz not null default now(),
  estado text not null default 'borrador'
    check (estado in ('borrador', 'revisada')),
  ingredientes jsonb not null default '[]',
  pasos jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recetas_user_id_idx on public.recetas (user_id);
create index if not exists recetas_fecha_captura_idx on public.recetas (fecha_captura desc);

alter table public.recetas enable row level security;

create policy "recetas_select_own" on public.recetas
  for select using (auth.uid() = user_id);

create policy "recetas_insert_own" on public.recetas
  for insert with check (auth.uid() = user_id);

create policy "recetas_update_own" on public.recetas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recetas_delete_own" on public.recetas
  for delete using (auth.uid() = user_id);

-- Mantiene updated_at al día en cada edición.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger recetas_set_updated_at
  before update on public.recetas
  for each row execute function public.set_updated_at();

-- Bucket privado para imágenes de recetas (tal cual, sin procesar).
insert into storage.buckets (id, name, public)
values ('imagenes', 'imagenes', false)
on conflict (id) do nothing;

create policy "imagenes_select_own" on storage.objects
  for select using (bucket_id = 'imagenes' and owner = auth.uid());

create policy "imagenes_insert_own" on storage.objects
  for insert with check (bucket_id = 'imagenes' and owner = auth.uid());

create policy "imagenes_delete_own" on storage.objects
  for delete using (bucket_id = 'imagenes' and owner = auth.uid());
