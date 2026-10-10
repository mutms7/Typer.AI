-- Request counts only. Never store document text, titles, API keys, or raw IPs.
create table if not exists public.typer_quota (
  key text primary key,
  used bigint not null check (used >= 0),
  expires bigint not null
);
alter table public.typer_quota enable row level security;
revoke all on table public.typer_quota from public, anon, authenticated;
grant select, insert, update, delete on table public.typer_quota to service_role;

create or replace function public.typer_reserve_quota(p_keys text[], p_limits bigint[], p_expires bigint[])
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  i integer;
  current_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000);
begin
  if cardinality(p_keys) <> 3 or cardinality(p_limits) <> 3 or cardinality(p_expires) <> 3 then
    raise exception 'Invalid quota windows';
  end if;
  -- Serialize all check-and-increment operations across backend instances.
  perform pg_advisory_xact_lock(739187402);
  delete from public.typer_quota where expires < current_ms;
  for i in 1..3 loop
    if p_keys[i] is null or p_limits[i] is null or p_limits[i] < 1 or p_expires[i] is null or p_expires[i] <= current_ms then
      raise exception 'Invalid quota window';
    end if;
    if coalesce((select used from public.typer_quota where key = p_keys[i]), 0) >= p_limits[i] then
      return false;
    end if;
  end loop;
  for i in 1..3 loop
    insert into public.typer_quota (key, used, expires) values (p_keys[i], 1, p_expires[i])
      on conflict (key) do update set used = public.typer_quota.used + 1;
  end loop;
  return true;
end;
$$;

create or replace function public.typer_quota_ready()
returns boolean language sql security invoker set search_path = '' as $$
  select count(*) >= 0 from public.typer_quota;
$$;

revoke all on function public.typer_reserve_quota(text[], bigint[], bigint[]) from public, anon, authenticated;
revoke all on function public.typer_quota_ready() from public, anon, authenticated;
grant execute on function public.typer_reserve_quota(text[], bigint[], bigint[]) to service_role;
grant execute on function public.typer_quota_ready() to service_role;
