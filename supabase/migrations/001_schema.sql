-- ============================================================
-- QASTNI DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  national_id TEXT,
  avatar_color TEXT DEFAULT '#2563eb',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, national_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'national_id'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─────────────────────────────────────────
-- 2. DEALS
-- ─────────────────────────────────────────
CREATE TABLE public.deals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_num    TEXT UNIQUE NOT NULL,
  buyer_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  buyer_email     TEXT NOT NULL,
  buyer_name      TEXT NOT NULL,
  seller_email    TEXT NOT NULL,
  seller_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  item            TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(12,2) NOT NULL CHECK (price > 0),
  down_payment    NUMERIC(12,2) DEFAULT 0 CHECK (down_payment >= 0),
  months          INTEGER NOT NULL CHECK (months BETWEEN 1 AND 60),
  installment     NUMERIC(12,2) NOT NULL CHECK (installment > 0),
  notes           TEXT,
  start_date      DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','active','rejected','completed')),
  accepted_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 3. PAYMENTS (installment schedule)
-- ─────────────────────────────────────────
CREATE TABLE public.payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id     UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  month_num   INTEGER NOT NULL CHECK (month_num > 0),
  due_date    DATE NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  is_paid     BOOLEAN DEFAULT FALSE,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, month_num)
);

-- ─────────────────────────────────────────
-- 4. RATINGS
-- ─────────────────────────────────────────
CREATE TABLE public.ratings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id     UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_email  TEXT NOT NULL,
  from_name   TEXT NOT NULL,
  to_email    TEXT NOT NULL,
  stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, from_user_id)   -- one rating per deal per person
);

-- ─────────────────────────────────────────
-- 5. NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- 'deal_request','deal_accepted','deal_rejected','payment_marked','deal_completed','rating_received'
  title_ar    TEXT NOT NULL,
  title_en    TEXT NOT NULL,
  body_ar     TEXT,
  body_en     TEXT,
  deal_id     UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 6. UPDATED_AT TRIGGER
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- ─────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- DEALS policies
CREATE POLICY "Users see their own deals"
  ON public.deals FOR SELECT
  USING (
    auth.uid() = buyer_id
    OR seller_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Buyers can create deals"
  ON public.deals FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers and sellers can update deals"
  ON public.deals FOR UPDATE
  USING (
    auth.uid() = buyer_id
    OR seller_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- PAYMENTS policies
CREATE POLICY "Deal parties see payments"
  ON public.payments FOR SELECT
  USING (
    deal_id IN (
      SELECT id FROM public.deals
      WHERE buyer_id = auth.uid()
        OR seller_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Buyers can insert payments schedule"
  ON public.payments FOR INSERT
  WITH CHECK (
    deal_id IN (SELECT id FROM public.deals WHERE buyer_id = auth.uid())
  );

CREATE POLICY "Buyers can mark payments"
  ON public.payments FOR UPDATE
  USING (
    deal_id IN (SELECT id FROM public.deals WHERE buyer_id = auth.uid())
  );

-- RATINGS policies
CREATE POLICY "Anyone can read ratings"
  ON public.ratings FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- NOTIFICATIONS policies
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 8. USEFUL VIEWS
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.deals_with_progress AS
SELECT
  d.*,
  COUNT(p.id)                              AS total_payments,
  COUNT(p.id) FILTER (WHERE p.is_paid)     AS paid_payments,
  COALESCE(AVG(r.stars),0)                 AS avg_rating,
  COUNT(r.id)                              AS rating_count
FROM public.deals d
LEFT JOIN public.payments p ON p.deal_id = d.id
LEFT JOIN public.ratings  r ON r.deal_id = d.id
GROUP BY d.id;

-- Grant view access
GRANT SELECT ON public.deals_with_progress TO authenticated;

-- ─────────────────────────────────────────
-- 9. USEFUL INDEXES
-- ─────────────────────────────────────────
CREATE INDEX idx_deals_buyer_id    ON public.deals(buyer_id);
CREATE INDEX idx_deals_seller_email ON public.deals(seller_email);
CREATE INDEX idx_deals_status      ON public.deals(status);
CREATE INDEX idx_payments_deal_id  ON public.payments(deal_id);
CREATE INDEX idx_notifs_user_id    ON public.notifications(user_id);
CREATE INDEX idx_ratings_to_email  ON public.ratings(to_email);

-- ─────────────────────────────────────────
-- 10. ENABLE REALTIME
-- ─────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ─────────────────────────────────────────
-- ✅ DONE - Schema ready!
-- ─────────────────────────────────────────
