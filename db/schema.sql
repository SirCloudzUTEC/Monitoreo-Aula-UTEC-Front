-- Initial schema for the UTEC campus platform.
-- Mirrors the domain rules in src/lib/auth/identity.ts and
-- src/lib/incidents/catalog.ts. Idempotent: safe to re-run.

create table if not exists usuarios (
  id bigint generated always as identity primary key,
  email text not null unique
    check (email = lower(email) and email like '%@utec.edu.pe'),
  nombre text not null default '',
  rol text not null default 'miembro'
    check (rol in ('superadmin', 'admin_operativo', 'miembro')),
  ambitos text[] not null default '{}',
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobada', 'suspendida')),
  creado_en timestamptz not null default now(),
  aprobado_en timestamptz,
  aprobado_por bigint references usuarios(id)
);

create table if not exists incidentes (
  id bigint generated always as identity primary key,
  categoria text not null check (categoria in (
    'robo', 'conducta_peligrosa', 'emergencia_medica', 'acoso',
    'infraestructura', 'falla_tecnologica', 'acceso_no_autorizado',
    'objeto_perdido', 'otro'
  )),
  prioridad text not null
    check (prioridad in ('critica', 'alta', 'media', 'baja')),
  ubicacion text not null check (char_length(ubicacion) between 1 and 120),
  descripcion text not null check (char_length(descripcion) between 10 and 2000),
  reportado_por bigint not null references usuarios(id),
  estado text not null default 'abierto'
    check (estado in ('abierto', 'en_atencion', 'resuelto', 'descartado')),
  creado_en timestamptz not null default now(),
  atendido_por bigint references usuarios(id),
  atendido_en timestamptz,
  resuelto_en timestamptz
);

create index if not exists incidentes_abiertos_idx
  on incidentes (estado, creado_en desc);

create table if not exists notificaciones (
  id bigint generated always as identity primary key,
  incidente_id bigint not null references incidentes(id) on delete cascade,
  ambito text not null
    check (ambito in ('seguridad', 'mantenimiento', 'ti', 'bienestar')),
  creado_en timestamptz not null default now(),
  leido_por bigint references usuarios(id),
  leido_en timestamptz
);

create index if not exists notificaciones_ambito_idx
  on notificaciones (ambito, creado_en desc);

-- Auditable record of role/state changes; superadmin actions must be traceable.
create table if not exists auditoria (
  id bigint generated always as identity primary key,
  actor bigint references usuarios(id),
  accion text not null,
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);
