-- ============================================================
--  Bitácora de trading · Esquema de Supabase
--  Pega este script completo en: Supabase → SQL Editor → Run
-- ============================================================

-- 1) Tabla de trades ------------------------------------------
create table if not exists public.trades (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fecha          timestamptz not null,
  activo         text not null,
  tipo           text not null check (tipo in ('compra', 'venta')),
  precio_entrada numeric,
  stop_loss      numeric,
  take_profit    numeric,
  precio_salida  numeric,
  resultado      numeric not null default 0,
  unidad         text not null default 'USD' check (unidad in ('USD', 'R')),
  estado         text not null check (estado in ('ganado', 'perdido', 'breakeven')),
  motivo         text not null default '',
  emocion        text not null default 'serena',
  lecciones      text not null default '',
  etiquetas      text[] not null default '{}',
  imagen_path    text,
  created_at     timestamptz not null default now()
);

create index if not exists trades_user_fecha_idx on public.trades (user_id, fecha desc);

-- 2) Seguridad por fila (RLS): cada usuario solo ve lo suyo ---
alter table public.trades enable row level security;

drop policy if exists "trades_select_own" on public.trades;
drop policy if exists "trades_insert_own" on public.trades;
drop policy if exists "trades_update_own" on public.trades;
drop policy if exists "trades_delete_own" on public.trades;

create policy "trades_select_own" on public.trades
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "trades_insert_own" on public.trades
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "trades_update_own" on public.trades
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "trades_delete_own" on public.trades
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 3) Bucket privado para las capturas -------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trade-images', 'trade-images', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 4) Políticas de Storage: cada usuario solo su carpeta {user_id}/
drop policy if exists "trade_images_select_own" on storage.objects;
drop policy if exists "trade_images_insert_own" on storage.objects;
drop policy if exists "trade_images_update_own" on storage.objects;
drop policy if exists "trade_images_delete_own" on storage.objects;

create policy "trade_images_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'trade-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "trade_images_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'trade-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "trade_images_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'trade-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "trade_images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'trade-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
