create schema if not exists app_private;

revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated;

create or replace function app_private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

create or replace function app_private.is_approved(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = _user_id and status = 'approved'
  );
$$;

create or replace function app_private.get_effective_doctor_id(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when app_private.has_role(_user_id, 'doctor') then _user_id
    when app_private.has_role(_user_id, 'secretary') then (
      select doctor_id from public.profiles where id = _user_id
    )
    else null
  end;
$$;

create or replace function app_private.is_subscription_valid(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select is_active and (subscription_end is null or subscription_end > now())
      from public.profiles
      where id = _user_id
    ),
    false
  );
$$;

create or replace function app_private.can_write(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_private.is_approved(_user_id)
     and app_private.is_subscription_valid(app_private.get_effective_doctor_id(_user_id));
$$;

grant execute on function app_private.has_role(uuid, public.app_role) to anon, authenticated;
grant execute on function app_private.is_approved(uuid) to anon, authenticated;
grant execute on function app_private.get_effective_doctor_id(uuid) to anon, authenticated;
grant execute on function app_private.is_subscription_valid(uuid) to anon, authenticated;
grant execute on function app_private.can_write(uuid) to anon, authenticated;

drop policy if exists "Admin updates admin settings" on public.admin_settings;
create policy "Admin updates admin settings"
on public.admin_settings
for update
to authenticated
using (app_private.has_role(auth.uid(), 'admin'::public.app_role))
with check (app_private.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Secretary views doctor settings" on public.doctor_settings;
create policy "Secretary views doctor settings"
on public.doctor_settings
for select
to public
using (doctor_id = app_private.get_effective_doctor_id(auth.uid()));

drop policy if exists "Admin views all login logs" on public.login_logs;
create policy "Admin views all login logs"
on public.login_logs
for select
to authenticated
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Doctor/secretary view patients" on public.patients;
create policy "Doctor/secretary view patients"
on public.patients
for select
to public
using ((doctor_id = app_private.get_effective_doctor_id(auth.uid())) and app_private.is_approved(auth.uid()));

drop policy if exists "Doctor deletes patients" on public.patients;
create policy "Doctor deletes patients"
on public.patients
for delete
to public
using ((doctor_id = auth.uid()) and app_private.has_role(auth.uid(), 'doctor'::public.app_role));

drop policy if exists "Doctor/secretary insert patients" on public.patients;
create policy "Doctor/secretary insert patients"
on public.patients
for insert
to authenticated
with check ((doctor_id = app_private.get_effective_doctor_id(auth.uid())) and app_private.can_write(auth.uid()));

drop policy if exists "Doctor updates patients" on public.patients;
create policy "Doctor updates patients"
on public.patients
for update
to authenticated
using ((doctor_id = auth.uid()) and app_private.has_role(auth.uid(), 'doctor'::public.app_role) and app_private.can_write(auth.uid()));

drop policy if exists "Secretary updates doctor patients" on public.patients;
create policy "Secretary updates doctor patients"
on public.patients
for update
to authenticated
using (app_private.has_role(auth.uid(), 'secretary'::public.app_role) and (doctor_id = app_private.get_effective_doctor_id(auth.uid())) and app_private.can_write(auth.uid()))
with check (app_private.has_role(auth.uid(), 'secretary'::public.app_role) and (doctor_id = app_private.get_effective_doctor_id(auth.uid())) and app_private.can_write(auth.uid()));

drop policy if exists "Secretary deletes doctor patients" on public.patients;
create policy "Secretary deletes doctor patients"
on public.patients
for delete
to authenticated
using (app_private.has_role(auth.uid(), 'secretary'::public.app_role) and (doctor_id = app_private.get_effective_doctor_id(auth.uid())) and app_private.is_approved(auth.uid()));

drop policy if exists "Doctor manages own prescriptions" on public.prescriptions;
create policy "Doctor manages own prescriptions"
on public.prescriptions
for all
to public
using ((doctor_id = auth.uid()) and app_private.has_role(auth.uid(), 'doctor'::public.app_role))
with check (doctor_id = auth.uid());

drop policy if exists "Secretary views prescriptions" on public.prescriptions;
create policy "Secretary views prescriptions"
on public.prescriptions
for select
to public
using ((doctor_id = app_private.get_effective_doctor_id(auth.uid())) and app_private.is_approved(auth.uid()));

drop policy if exists "Admin views all profiles" on public.profiles;
create policy "Admin views all profiles"
on public.profiles
for select
to public
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admin updates all profiles" on public.profiles;
create policy "Admin updates all profiles"
on public.profiles
for update
to public
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Doctor updates own secretaries" on public.profiles;
create policy "Doctor updates own secretaries"
on public.profiles
for update
to public
using ((doctor_id = auth.uid()) and app_private.has_role(auth.uid(), 'doctor'::public.app_role));

drop policy if exists "Admin views all roles" on public.user_roles;
create policy "Admin views all roles"
on public.user_roles
for select
to public
using (app_private.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Clinic members read attachments" on storage.objects;
create policy "Clinic members read attachments"
on storage.objects
for select
to authenticated
using (
  (bucket_id = 'attachments')
  and app_private.is_approved(auth.uid())
  and (
    app_private.get_effective_doctor_id(((storage.foldername(name))[1])::uuid)
    = app_private.get_effective_doctor_id(auth.uid())
  )
);

drop policy if exists "Owner uploads attachments" on storage.objects;
create policy "Owner uploads attachments"
on storage.objects
for insert
to authenticated
with check (
  (bucket_id = 'attachments')
  and app_private.is_approved(auth.uid())
  and ((storage.foldername(name))[1] = (auth.uid())::text)
);

revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated;
revoke execute on function public.is_approved(uuid) from anon, authenticated;
revoke execute on function public.get_effective_doctor_id(uuid) from anon, authenticated;
revoke execute on function public.is_subscription_valid(uuid) from anon, authenticated;
revoke execute on function public.can_write(uuid) from anon, authenticated;