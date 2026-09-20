-- Búsqueda de texto completo (RF-05.2) sobre título, texto crudo y etiquetas.
-- Postgres nativo (tsvector + índice GIN), sin coste ni dependencias externas.
--
-- Nota: se probó primero como columna GENERATED ALWAYS AS ... STORED, pero Postgres la rechaza
-- (SQLSTATE 42P17 "generation expression is not immutable") incluso envolviendo to_tsvector en
-- una función propia marcada IMMUTABLE. Se usa en su lugar el patrón clásico de trigger, que no
-- tiene esa restricción y es el enfoque estándar de full-text search en Postgres.

alter table public.recetas add column busqueda tsvector;

create or replace function public.recetas_actualizar_busqueda()
returns trigger
language plpgsql
as $$
begin
  new.busqueda := to_tsvector(
    'spanish',
    coalesce(new.titulo, '') || ' ' || coalesce(new.texto_crudo, '') || ' ' || array_to_string(new.etiquetas, ' ')
  );
  return new;
end;
$$;

create trigger recetas_busqueda_trigger
  before insert or update on public.recetas
  for each row execute function public.recetas_actualizar_busqueda();

create index if not exists recetas_busqueda_idx on public.recetas using gin (busqueda);

-- Recetas creadas antes de este trigger: recalculamos su columna de búsqueda una vez.
update public.recetas
set busqueda = to_tsvector(
  'spanish',
  coalesce(titulo, '') || ' ' || coalesce(texto_crudo, '') || ' ' || array_to_string(etiquetas, ' ')
);
