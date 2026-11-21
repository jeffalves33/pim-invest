-- =====================================================================
-- PIM — Personal Investment Management
-- Schema completo para Supabase (Postgres 15+)
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma única vez.
-- Pode ser executado de novo: usa "if not exists" e "create or replace".
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Função utilitária: updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- ATIVOS
-- ---------------------------------------------------------------------
create table if not exists public.assets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ticker            text not null,
  name              text not null,
  related_tickers   text,
  asset_class       text not null default 'acao'
                    check (asset_class in ('acao','fii','etf','bdr','fundo','renda_fixa','cripto','outro')),
  sector            text,
  category          text,
  market            text,
  currency          text not null default 'BRL',
  country           text not null default 'Brasil',
  website           text,
  ri_site           text,
  description       text,
  phase             text not null default 'f1'
                    check (phase in ('f1','f2','f3','f4','f5','f6')),
  current_price     numeric(18,4),
  price_date        date,
  price_source      text,
  price_updated_at  timestamptz,
  market_cap        numeric(20,2),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint assets_ticker_upper check (ticker = upper(ticker)),
  constraint assets_user_ticker_key unique (user_id, ticker)
);

create index if not exists assets_user_idx on public.assets(user_id);

drop trigger if exists assets_updated_at on public.assets;
create trigger assets_updated_at before update on public.assets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- TESES (versionadas; nunca apagadas depois de concluídas)
-- status: draft (em andamento) | current (vigente) | superseded (anterior)
-- ---------------------------------------------------------------------
create table if not exists public.theses (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_id                      uuid not null references public.assets(id) on delete cascade,
  version                       integer not null,
  status                        text not null default 'draft'
                                check (status in ('draft','current','superseded')),

  -- 1. Identificação
  analysis_date                 date,
  horizon                       text,
  philosophy                    text,
  next_review                   date,
  price_ref_date                date,
  last_balance                  text,
  objective                     text,
  data_sources                  text,

  -- 2. Tese
  opportunity                   text,
  why_appreciate                text,
  invalidation                  text,

  -- 4. Valuation
  price_at_analysis             numeric(18,4),
  fair_value_pess               numeric(18,4),
  fair_value_base               numeric(18,4),
  fair_value_opt                numeric(18,4),
  safety_margin                 numeric(6,2),
  max_buy_price                 numeric(18,4),
  max_buy_manual                boolean not null default false,
  methodology                   text,
  assumptions                   text,

  -- 5. Estratégia de compra
  entry_condition               text,
  max_contributions             integer,
  first_purchase_plan           text,
  additional_purchase_criteria  text,
  no_buy_conditions             text,

  -- 6. Estratégia de venda
  reduce_conditions             text,
  full_sell_conditions          text,
  hold_after_target             text,

  -- 8. Conclusão
  classification                text check (classification in ('aprovado','condicional','observacao','rejeitado','suspenso')),
  quality                       text check (quality in ('baixo','medio','alto')),
  price_attractiveness          text check (price_attractiveness in ('baixo','medio','alto')),
  overall_risk                  text check (overall_risk in ('baixo','medio','alto')),
  confidence                    text check (confidence in ('baixo','medio','alto')),
  justification                 text,
  limitations                   text,

  dossier_url                   text,
  concluded_at                  timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),

  constraint theses_asset_version_key unique (asset_id, version),
  constraint theses_fair_values_order check (
    fair_value_pess is null or fair_value_base is null or fair_value_pess <= fair_value_base
  ),
  constraint theses_fair_values_order2 check (
    fair_value_base is null or fair_value_opt is null or fair_value_base <= fair_value_opt
  )
);

create index if not exists theses_user_idx on public.theses(user_id);
create index if not exists theses_asset_idx on public.theses(asset_id);
create unique index if not exists theses_one_current_per_asset
  on public.theses(asset_id) where status = 'current';
create unique index if not exists theses_one_draft_per_asset
  on public.theses(asset_id) where status = 'draft';

drop trigger if exists theses_updated_at on public.theses;
create trigger theses_updated_at before update on public.theses
  for each row execute function public.set_updated_at();

-- Versão automática quando não informada
create or replace function public.theses_set_version()
returns trigger
language plpgsql
as $$
begin
  if new.version is null then
    select coalesce(max(version), 0) + 1 into new.version
      from public.theses where asset_id = new.asset_id;
  end if;
  return new;
end;
$$;

drop trigger if exists theses_version on public.theses;
create trigger theses_version before insert on public.theses
  for each row execute function public.theses_set_version();

-- Ao tornar uma versão vigente, a vigente anterior vira "superseded"
create or replace function public.theses_supersede_previous()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'current' and (tg_op = 'INSERT' or old.status is distinct from 'current') then
    update public.theses
       set status = 'superseded'
     where asset_id = new.asset_id
       and id <> new.id
       and status = 'current';
    if new.concluded_at is null then
      new.concluded_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists theses_supersede on public.theses;
create trigger theses_supersede before insert or update of status on public.theses
  for each row execute function public.theses_supersede_previous();

-- Impede apagar versões concluídas (metodologia: versões não se apagam)
create or replace function public.theses_protect_delete()
returns trigger
language plpgsql
as $$
begin
  -- Permite a exclusão em cascata quando o próprio ativo é apagado
  if old.status <> 'draft'
     and exists (select 1 from public.assets a where a.id = old.asset_id) then
    raise exception 'Versões concluídas de tese não podem ser apagadas';
  end if;
  return old;
end;
$$;

drop trigger if exists theses_no_delete on public.theses;
create trigger theses_no_delete before delete on public.theses
  for each row execute function public.theses_protect_delete();

-- ---------------------------------------------------------------------
-- Itens da tese
-- ---------------------------------------------------------------------
create table if not exists public.thesis_indicators (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  thesis_id   uuid not null references public.theses(id) on delete cascade,
  name        text not null,
  value       numeric(20,4),
  period      text,
  note        text,
  is_custom   boolean not null default false,
  sort        integer not null default 0
);
create index if not exists thesis_indicators_thesis_idx on public.thesis_indicators(thesis_id);

create table if not exists public.thesis_triggers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  thesis_id      uuid not null references public.theses(id) on delete cascade,
  indicator      text not null,
  condition      text not null check (condition in ('lt','gt')),
  limit_value    numeric(20,4) not null,
  current_value  numeric(20,4),
  value_date     date,
  sort           integer not null default 0
);
create index if not exists thesis_triggers_thesis_idx on public.thesis_triggers(thesis_id);

create table if not exists public.thesis_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  thesis_id    uuid not null references public.theses(id) on delete cascade,
  event_date   date not null,
  description  text not null,
  done         boolean not null default false
);
create index if not exists thesis_events_thesis_idx on public.thesis_events(thesis_id);
create index if not exists thesis_events_date_idx on public.thesis_events(event_date);

create table if not exists public.thesis_risks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  thesis_id    uuid not null references public.theses(id) on delete cascade,
  description  text not null,
  category     text,
  probability  text check (probability in ('baixo','medio','alto')),
  impact       text check (impact in ('baixo','medio','alto')),
  notes        text,
  sort         integer not null default 0
);
create index if not exists thesis_risks_thesis_idx on public.thesis_risks(thesis_id);

-- ---------------------------------------------------------------------
-- CARTEIRA: operações e proventos
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_id                 uuid not null references public.assets(id) on delete cascade,
  thesis_id                uuid references public.theses(id) on delete set null,
  type                     text not null check (type in ('buy','sell')),
  trade_date               date not null,
  quantity                 numeric(20,6) not null check (quantity > 0),
  price                    numeric(18,4) not null check (price >= 0),
  fees                     numeric(18,4) not null default 0 check (fees >= 0),
  notes                    text,
  outside_criteria         boolean not null default false,
  exception_justification  text,
  created_at               timestamptz not null default now(),
  constraint transactions_exception_needs_reason check (
    outside_criteria = false or length(coalesce(trim(exception_justification), '')) > 0
  )
);
create index if not exists transactions_user_idx on public.transactions(user_id);
create index if not exists transactions_asset_idx on public.transactions(asset_id, trade_date);

create table if not exists public.proceeds (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_id    uuid not null references public.assets(id) on delete cascade,
  kind        text not null default 'dividendo' check (kind in ('dividendo','jcp','rendimento','outro')),
  pay_date    date not null,
  amount      numeric(18,2) not null check (amount > 0),
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists proceeds_asset_idx on public.proceeds(asset_id, pay_date);

-- ---------------------------------------------------------------------
-- Histórico de cotações e log de atividades
-- ---------------------------------------------------------------------
create table if not exists public.price_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_id    uuid not null references public.assets(id) on delete cascade,
  price_date  date not null,
  price       numeric(18,4) not null,
  source      text,
  created_at  timestamptz not null default now(),
  constraint price_history_asset_date_key unique (asset_id, price_date)
);

create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_id    uuid references public.assets(id) on delete cascade,
  thesis_id   uuid references public.theses(id) on delete set null,
  action      text not null,
  summary     text not null,
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists activity_log_user_idx on public.activity_log(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- VIEW: posições (custo médio ponderado das compras)
-- security_invoker = respeita o RLS de quem consulta
-- ---------------------------------------------------------------------
create or replace view public.v_positions
with (security_invoker = true)
as
with t as (
  select
    asset_id,
    user_id,
    sum(case when type = 'buy'  then quantity else 0 end)                 as qty_bought,
    sum(case when type = 'sell' then quantity else 0 end)                 as qty_sold,
    sum(case when type = 'buy'  then quantity * price + fees else 0 end)  as cost_bought,
    sum(case when type = 'sell' then quantity * price - fees else 0 end)  as proceeds_sold,
    min(trade_date)                                                       as first_trade,
    max(trade_date)                                                       as last_trade,
    count(*)                                                              as trades,
    count(*) filter (where outside_criteria)                              as trades_outside_criteria
  from public.transactions
  group by asset_id, user_id
),
p as (
  select asset_id, sum(amount) as proceeds_received
  from public.proceeds
  group by asset_id
)
select
  a.id                                         as asset_id,
  a.user_id,
  a.ticker,
  a.name,
  a.current_price,
  a.price_date,
  t.qty_bought,
  t.qty_sold,
  (t.qty_bought - t.qty_sold)                  as quantity,
  case when t.qty_bought > 0 then t.cost_bought / t.qty_bought end as avg_cost,
  case when t.qty_bought > 0 then (t.qty_bought - t.qty_sold) * (t.cost_bought / t.qty_bought) end as invested,
  (t.qty_bought - t.qty_sold) * a.current_price as market_value,
  case when t.qty_bought > 0
       then t.proceeds_sold - t.qty_sold * (t.cost_bought / t.qty_bought) end as realized_pnl,
  coalesce(p.proceeds_received, 0)             as proceeds_received,
  t.first_trade,
  t.last_trade,
  t.trades,
  t.trades_outside_criteria
from public.assets a
join t on t.asset_id = a.id
left join p on p.asset_id = a.id;

-- ---------------------------------------------------------------------
-- RLS: cada usuário só vê e altera as próprias linhas
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'assets','theses','thesis_indicators','thesis_triggers','thesis_events',
    'thesis_risks','transactions','proceeds','price_history','activity_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own_rows" on public.%I', t);
    execute format(
      'create policy "own_rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

grant select on public.v_positions to authenticated;
