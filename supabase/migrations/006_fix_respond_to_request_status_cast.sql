-- Fix: respond_to_request() failed with
--   "column "status" is of type request_status but expression is of type text"
--
-- Root cause: `case when p_accept then 'accepted' else 'declined' end` resolves
-- its string literals to `text` (not the enum's `unknown`-literal fast path),
-- since a CASE with only literal branches has no other context to infer from.
-- Assigning `text` to an enum column has no implicit cast, so the UPDATE failed.
-- Fix is to cast the CASE result to the enum explicitly.

create or replace function public.respond_to_request(
  p_request_id uuid,
  p_accept boolean
)
returns public.session_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.session_requests;
begin
  select * into v_request from public.session_requests where request_id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_request.teacher_id <> auth.uid() then
    raise exception 'Only the teacher can respond to this request';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This request has already been responded to';
  end if;

  update public.session_requests
  set status = case when p_accept then 'accepted' else 'declined' end::public.request_status,
      responded_at = now()
  where request_id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;
