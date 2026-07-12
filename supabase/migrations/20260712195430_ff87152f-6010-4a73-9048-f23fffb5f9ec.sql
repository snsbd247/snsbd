-- Phase 7: notifications center + knowledge base

-- 1) Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications(user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications read" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notifications update" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notifications delete" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2) Knowledge base
CREATE TABLE public.kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kb_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.kb_categories TO authenticated;
GRANT ALL ON public.kb_categories TO service_role;
ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb categories public read" ON public.kb_categories FOR SELECT USING (true);
CREATE POLICY "kb categories admin write" ON public.kb_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER kb_categories_updated BEFORE UPDATE ON public.kb_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT false,
  views INT NOT NULL DEFAULT 0,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kb_articles_published_idx ON public.kb_articles(published, updated_at DESC);
CREATE INDEX kb_articles_category_idx ON public.kb_articles(category_id);

GRANT SELECT ON public.kb_articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.kb_articles TO authenticated;
GRANT ALL ON public.kb_articles TO service_role;
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb articles public read published" ON public.kb_articles
  FOR SELECT USING (published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "kb articles admin write" ON public.kb_articles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER kb_articles_updated BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Notification helpers used by app triggers/functions
CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id UUID, _type TEXT, _title TEXT, _body TEXT DEFAULT NULL, _link TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id UUID;
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (_user_id, _type, _title, _body, _link)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

-- 4) Auto-emit notifications on key events

-- On new invoice → notify customer
CREATE OR REPLACE FUNCTION public.notify_invoice_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_user(
    NEW.customer_id, 'invoice',
    'New invoice ' || NEW.invoice_number,
    'Amount: ' || NEW.total::text,
    '/invoices/' || NEW.id::text
  );
  RETURN NEW;
END $$;
CREATE TRIGGER notifications_on_invoice_insert
AFTER INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.notify_invoice_created();

-- On service status change → notify customer
CREATE OR REPLACE FUNCTION public.notify_service_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notify_user(
      NEW.customer_id, 'service',
      NEW.name || ' is now ' || NEW.status,
      NULL,
      '/services/' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notifications_on_service_status
AFTER UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.notify_service_status_change();

-- On support ticket reply → notify the other party
CREATE OR REPLACE FUNCTION public.notify_support_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t RECORD;
BEGIN
  SELECT customer_id, assigned_to, subject INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF t.customer_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.sender_id = t.customer_id THEN
    IF t.assigned_to IS NOT NULL THEN
      PERFORM public.notify_user(t.assigned_to, 'ticket',
        'Customer replied: ' || t.subject, NULL, '/tickets/' || NEW.ticket_id::text);
    END IF;
  ELSE
    IF COALESCE(NEW.is_internal, false) = false THEN
      PERFORM public.notify_user(t.customer_id, 'ticket',
        'Support replied: ' || t.subject, NULL, '/tickets/' || NEW.ticket_id::text);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notifications_on_support_message
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_support_message();
