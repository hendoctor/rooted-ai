
-- Give company members read-only visibility into mapping tables so client portal joins work

-- Announcements mapping
create policy "Company members can read announcement assignments"
on public.announcement_companies
for select
using (
  exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = announcement_companies.company_id
      and cm.user_id = auth.uid()
  )
);

-- Training & Resources mapping
create policy "Company members can read resource assignments"
on public.portal_resource_companies
for select
using (
  exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = portal_resource_companies.company_id
      and cm.user_id = auth.uid()
  )
);

-- Useful Links mapping
create policy "Company members can read useful link assignments"
on public.useful_link_companies
for select
using (
  exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = useful_link_companies.company_id
      and cm.user_id = auth.uid()
  )
);

-- Adoption Coaching mapping
create policy "Company members can read adoption coaching assignments"
on public.adoption_coaching_companies
for select
using (
  exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = adoption_coaching_companies.company_id
      and cm.user_id = auth.uid()
  )
);

-- Reports mapping
create policy "Company members can read report assignments"
on public.report_companies
for select
using (
  exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = report_companies.company_id
      and cm.user_id = auth.uid()
  )
);

-- FAQs mapping
create policy "Company members can read FAQ assignments"
on public.faq_companies
for select
using (
  exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = faq_companies.company_id
      and cm.user_id = auth.uid()
  )
);
