
DO $$
DECLARE
  c1 uuid := '11111111-1111-1111-1111-111111111101';
  c2 uuid := '11111111-1111-1111-1111-111111111102';
  c3 uuid := '11111111-1111-1111-1111-111111111103';
  c4 uuid := '11111111-1111-1111-1111-111111111104';
  p1 uuid := '22222222-2222-2222-2222-222222222201';
  p2 uuid := '22222222-2222-2222-2222-222222222202';
  p3 uuid := '22222222-2222-2222-2222-222222222203';
  p4 uuid := '22222222-2222-2222-2222-222222222204';
  s_dom1 uuid := '33333333-3333-3333-3333-333333333301';
  s_dom2 uuid := '33333333-3333-3333-3333-333333333302';
  s_dom3 uuid := '33333333-3333-3333-3333-333333333303';
  s_dom4 uuid := '33333333-3333-3333-3333-333333333304';
  s_host1 uuid := '44444444-4444-4444-4444-444444444401';
  s_host2 uuid := '44444444-4444-4444-4444-444444444402';
  s_host3 uuid := '44444444-4444-4444-4444-444444444403';
  s_oth1 uuid := '55555555-5555-5555-5555-555555555501';
  s_oth2 uuid := '55555555-5555-5555-5555-555555555502';
  inv1 uuid := '66666666-6666-6666-6666-666666666601';
  inv2 uuid := '66666666-6666-6666-6666-666666666602';
  inv3 uuid := '66666666-6666-6666-6666-666666666603';
  inv4 uuid := '66666666-6666-6666-6666-666666666604';
  inv5 uuid := '66666666-6666-6666-6666-666666666605';
  tm1 uuid := '77777777-7777-7777-7777-777777777701';
  tm2 uuid := '77777777-7777-7777-7777-777777777702';
  tm3 uuid := '77777777-7777-7777-7777-777777777703';
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES
    ('00000000-0000-0000-0000-000000000000', c1, 'authenticated', 'authenticated', 'rahim@demo.local', crypt('Demo@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rahim Uddin"}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', c2, 'authenticated', 'authenticated', 'karim@demo.local', crypt('Demo@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Karim Ahmed"}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', c3, 'authenticated', 'authenticated', 'nadia@demo.local', crypt('Demo@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nadia Islam"}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', c4, 'authenticated', 'authenticated', 'sabbir@demo.local', crypt('Demo@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sabbir Hasan"}', false, '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), c1, c1::text, jsonb_build_object('sub', c1::text, 'email', 'rahim@demo.local'), 'email', now(), now(), now()),
    (gen_random_uuid(), c2, c2::text, jsonb_build_object('sub', c2::text, 'email', 'karim@demo.local'), 'email', now(), now(), now()),
    (gen_random_uuid(), c3, c3::text, jsonb_build_object('sub', c3::text, 'email', 'nadia@demo.local'), 'email', now(), now(), now()),
    (gen_random_uuid(), c4, c4::text, jsonb_build_object('sub', c4::text, 'email', 'sabbir@demo.local'), 'email', now(), now(), now())
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles SET full_name='Rahim Uddin', company='Rahim Traders', phone='+8801711000001', address='Dhaka, Bangladesh' WHERE id=c1;
  UPDATE public.profiles SET full_name='Karim Ahmed', company='Karim IT Solutions', phone='+8801711000002', address='Chattogram, Bangladesh' WHERE id=c2;
  UPDATE public.profiles SET full_name='Nadia Islam', company='Nadia Fashion House', phone='+8801711000003', address='Sylhet, Bangladesh' WHERE id=c3;
  UPDATE public.profiles SET full_name='Sabbir Hasan', company='Sabbir Enterprise', phone='+8801711000004', address='Khulna, Bangladesh' WHERE id=c4;

  INSERT INTO public.projects (id, customer_id, name, description, status, start_date, end_date, budget) VALUES
    (p1, c1, 'Rahim Traders Website', 'Corporate website with product catalog', 'in_progress', now()::date - 30, now()::date + 30, 45000),
    (p2, c2, 'Karim IT ERP', 'Custom ERP for internal operations', 'planning', now()::date - 5, now()::date + 90, 250000),
    (p3, c3, 'Nadia Fashion E-commerce', 'Online store with payment gateway', 'completed', now()::date - 180, now()::date - 20, 120000),
    (p4, c4, 'Sabbir Enterprise Landing', 'Marketing landing page + blog', 'in_progress', now()::date - 10, now()::date + 20, 25000)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.project_milestones (project_id, title, description, due_date, completed, sort_order) VALUES
    (p1, 'Design mockups', 'Homepage and product page designs', now()::date - 15, true, 1),
    (p1, 'Frontend development', 'Build responsive UI', now()::date + 5, false, 2),
    (p1, 'Launch', 'Go live', now()::date + 25, false, 3),
    (p2, 'Requirements gathering', 'Meet stakeholders', now()::date + 5, false, 1),
    (p2, 'ERP module 1: Inventory', 'Inventory module build', now()::date + 40, false, 2),
    (p3, 'Design', 'Full design system', now()::date - 150, true, 1),
    (p3, 'Development', 'Full stack build', now()::date - 60, true, 2),
    (p3, 'Launch', 'Production release', now()::date - 20, true, 3),
    (p4, 'Content writing', 'Copy for all sections', now()::date + 3, false, 1),
    (p4, 'Deploy', 'Ship to production', now()::date + 18, false, 2);

  INSERT INTO public.services (id, customer_id, project_id, type, name, details, purchase_date, expiry_date, cost_price, sale_price, status, registrar, nameservers, renewable) VALUES
    (s_dom1, c1, p1, 'domain', 'rahimtraders.com', '.com domain', now()::date - 200, now()::date + 165, 900, 1500, 'active', 'Namecheap', 'ns1.snsbd.com, ns2.snsbd.com', true),
    (s_dom2, c2, p2, 'domain', 'karim-it.com', '.com domain', now()::date - 60, now()::date + 305, 900, 1500, 'active', 'GoDaddy', 'ns1.snsbd.com, ns2.snsbd.com', true),
    (s_dom3, c3, p3, 'domain', 'nadiafashion.com.bd', '.com.bd domain', now()::date - 300, now()::date + 65, 1500, 2500, 'active', 'BTCL', 'ns1.snsbd.com, ns2.snsbd.com', true),
    (s_dom4, c4, p4, 'domain', 'sabbirenterprise.com', '.com domain', now()::date - 400, now()::date - 5, 900, 1500, 'expired', 'Namecheap', 'ns1.snsbd.com, ns2.snsbd.com', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.services (id, customer_id, project_id, type, name, details, purchase_date, expiry_date, cost_price, sale_price, status, renewable, cpanel_url, cpanel_username, cpanel_password) VALUES
    (s_host1, c1, p1, 'hosting', 'Business Hosting 10GB', 'cPanel shared hosting, 10GB SSD', now()::date - 200, now()::date + 165, 2500, 5000, 'active', true, 'https://server1.snsbd.com:2083', 'rahimtr', 'Demo@Cpanel1'),
    (s_host2, c2, p2, 'hosting', 'Business Hosting 20GB', 'cPanel shared hosting, 20GB SSD', now()::date - 60, now()::date + 305, 4000, 7500, 'active', true, 'https://server1.snsbd.com:2083', 'karimit', 'Demo@Cpanel2'),
    (s_host3, c3, p3, 'hosting', 'VPS Standard', 'KVM VPS 4GB RAM', now()::date - 300, now()::date + 65, 8000, 15000, 'active', true, 'https://vps.snsbd.com:2083', 'nadiavps', 'Demo@Cpanel3')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.services (id, customer_id, project_id, type, name, details, purchase_date, expiry_date, cost_price, sale_price, status, renewable) VALUES
    (s_oth1, c1, p1, 'other', 'SSL Certificate', 'Positive SSL 1 year', now()::date - 200, now()::date + 165, 500, 1200, 'active', true),
    (s_oth2, c3, p3, 'software', 'Email Marketing Tool', 'Bulk mailer license', now()::date - 90, now()::date + 275, 3000, 6000, 'active', false)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.invoices (id, customer_id, project_id, invoice_number, issue_date, due_date, subtotal, tax, total, amount_paid, status, notes) VALUES
    (inv1, c1, p1, 'INV-2026-0001', now()::date - 25, now()::date - 10, 45000, 0, 45000, 45000, 'paid', 'Website development — 50% milestone'),
    (inv2, c2, p2, 'INV-2026-0002', now()::date - 5, now()::date + 10, 50000, 0, 50000, 25000, 'partial', 'ERP kickoff — advance'),
    (inv3, c3, p3, 'INV-2026-0003', now()::date - 40, now()::date - 25, 120000, 0, 120000, 120000, 'paid', 'E-commerce final payment'),
    (inv4, c4, p4, 'INV-2026-0004', now()::date - 2, now()::date + 13, 25000, 0, 25000, 0, 'sent', 'Landing page project'),
    (inv5, c1, p1, 'INV-2026-0005', now()::date, now()::date + 15, 7700, 0, 7700, 0, 'draft', 'Annual renewal: domain + hosting + SSL')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.invoice_items (invoice_id, service_id, description, quantity, unit_price, total) VALUES
    (inv1, NULL, 'Website development — 50% milestone', 1, 45000, 45000),
    (inv2, NULL, 'ERP kickoff — Requirements & design', 1, 50000, 50000),
    (inv3, NULL, 'E-commerce full development', 1, 120000, 120000),
    (inv4, NULL, 'Landing page + blog', 1, 25000, 25000),
    (inv5, s_dom1, 'DOMAIN — rahimtraders.com (renewal)', 1, 1500, 1500),
    (inv5, s_host1, 'HOSTING — Business Hosting 10GB (renewal)', 1, 5000, 5000),
    (inv5, s_oth1, 'OTHER — SSL Certificate (renewal)', 1, 1200, 1200);

  INSERT INTO public.payments (invoice_id, amount, paid_at, method, reference, receipt_number, notes) VALUES
    (inv1, 45000, now()::date - 12, 'bKash', 'TXN-BKASH-001', 'SNS-2026-06-0001', 'Received via bKash'),
    (inv2, 25000, now()::date - 3, 'Bank Transfer', 'DBBL-778899', 'SNS-2026-07-0002', 'Advance for ERP kickoff'),
    (inv3, 60000, now()::date - 45, 'bKash', 'TXN-BKASH-002', 'SNS-2026-05-0003', 'First installment'),
    (inv3, 60000, now()::date - 25, 'Bank Transfer', 'DBBL-112233', 'SNS-2026-06-0004', 'Final installment');

  INSERT INTO public.team_members (id, full_name, email, phone, role, monthly_salary, joined_at, active) VALUES
    (tm1, 'Arif Rahman', 'arif@snsbd.com', '+8801812000001', 'Lead Developer', 60000, now()::date - 400, true),
    (tm2, 'Sumaiya Akter', 'sumaiya@snsbd.com', '+8801812000002', 'UI/UX Designer', 45000, now()::date - 300, true),
    (tm3, 'Jubayer Alam', 'jubayer@snsbd.com', '+8801812000003', 'Support Engineer', 30000, now()::date - 200, true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.salary_payments (team_member_id, amount, pay_period, paid_at, notes) VALUES
    (tm1, 60000, to_char(now() - interval '1 month', 'YYYY-MM'), (date_trunc('month', now()) - interval '1 day')::date, 'On time'),
    (tm2, 45000, to_char(now() - interval '1 month', 'YYYY-MM'), (date_trunc('month', now()) - interval '1 day')::date, 'On time'),
    (tm3, 30000, to_char(now() - interval '1 month', 'YYYY-MM'), (date_trunc('month', now()) - interval '1 day')::date, 'On time'),
    (tm1, 60000, to_char(now() - interval '2 month', 'YYYY-MM'), (date_trunc('month', now()) - interval '32 day')::date, 'On time'),
    (tm2, 45000, to_char(now() - interval '2 month', 'YYYY-MM'), (date_trunc('month', now()) - interval '32 day')::date, 'On time'),
    (tm3, 30000, to_char(now() - interval '2 month', 'YYYY-MM'), (date_trunc('month', now()) - interval '32 day')::date, 'On time');

  INSERT INTO public.expenses (category, description, amount, expense_date, vendor, notes) VALUES
    ('server', 'DigitalOcean droplet', 3200, now()::date - 15, 'DigitalOcean', 'Production server monthly'),
    ('office', 'Office rent', 25000, now()::date - 10, 'Landlord', 'Monthly rent'),
    ('utility', 'Internet bill', 3500, now()::date - 8, 'Link3', 'Fiber connection'),
    ('marketing', 'Facebook ads', 8000, now()::date - 20, 'Meta', 'Boost campaign'),
    ('other', 'Domain renewals (registrar)', 4500, now()::date - 5, 'Namecheap', 'Bulk renewal');

  INSERT INTO public.company_settings (id, company_name, email, phone, address, footer_copyright)
  VALUES (true, 'SNS BD', 'info@snsbd.com', '+8801700000000', 'Dhaka, Bangladesh', '© ' || extract(year from now())::text || ' SNS BD. All rights reserved.')
  ON CONFLICT (id) DO NOTHING;
END $$;
