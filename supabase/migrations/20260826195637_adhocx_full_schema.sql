-- ============================================================
-- AdhocX Full Schema Migration
-- Timestamp: 20260826195637
-- Tables: user_profiles, driver_profiles, vendor_profiles,
--         trips, driver_wallets, payout_requests,
--         driver_payout_requests, drivers, driver_withdrawals
-- Storage: driver-documents bucket
-- ============================================================

-- ============================================================
-- STEP 1: ENUM TYPES (safe creation without CASCADE drop)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.vehicle_type AS ENUM ('Sedan', 'SUV');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.trip_status AS ENUM (
    'payment_pending',
    'broadcasting',
    'assigned',
    'arrived',
    'in_progress',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.route_mode AS ENUM (
    'one_pickup_multi_drop',
    'multi_pickup_one_drop'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_status AS ENUM ('pending', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- STEP 2: CORE TABLES
-- ============================================================

-- user_profiles (references auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'vendor',
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- driver_profiles
CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT UNIQUE,
  vehicle_plate TEXT,
  vehicle_model TEXT NOT NULL DEFAULT 'Maruti Swift Dzire',
  upi_id TEXT,
  wallet_balance NUMERIC DEFAULT 0.00,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  vehicle_type public.vehicle_type NOT NULL DEFAULT 'Sedan'::public.vehicle_type,
  is_online BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  dl_number TEXT,
  pan_number TEXT,
  dl_doc_url TEXT,
  rc_doc_url TEXT,
  insurance_doc_url TEXT,
  id_doc_url TEXT,
  current_lat NUMERIC,
  current_lng NUMERIC,
  vehicle_number VARCHAR,
  heading NUMERIC DEFAULT 0,
  last_location_updated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  aadhaar_number TEXT,
  rc_number TEXT,
  dl_expiry TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  profile_photo_url TEXT,
  dl_front_url TEXT,
  dl_back_url TEXT,
  rc_document_url TEXT,
  insurance_document_url TEXT,
  aadhaar_document_url TEXT,
  email TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- vendor_profiles
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  gstin TEXT,
  default_hub TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  current_lat NUMERIC,
  current_lng NUMERIC,
  last_location_updated_at TIMESTAMPTZ
);

-- trips
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL,
  pickup_landmark TEXT,
  drop_address TEXT NOT NULL,
  pickup_timestamp TIMESTAMPTZ,
  drop_timestamp TIMESTAMPTZ,
  distance_km NUMERIC,
  escort_guard BOOLEAN DEFAULT false,
  passengers INTEGER DEFAULT 1,
  base_fare NUMERIC,
  escort_fee NUMERIC DEFAULT 0.00,
  total_fare NUMERIC,
  driver_payout NUMERIC,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'UPI',
  utr_reference TEXT,
  otp_start TEXT,
  otp_end TEXT,
  trip_started_at TIMESTAMPTZ,
  trip_ended_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  status public.trip_status NOT NULL DEFAULT 'payment_pending'::public.trip_status,
  vehicle_type public.vehicle_type NOT NULL DEFAULT 'Sedan'::public.vehicle_type,
  route_mode public.route_mode NOT NULL DEFAULT 'one_pickup_multi_drop'::public.route_mode,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  drop_lat NUMERIC,
  drop_lng NUMERIC,
  with_escort BOOLEAN NOT NULL DEFAULT false,
  final_fare NUMERIC,
  platform_fee NUMERIC,
  otp_code TEXT,
  payment_utr TEXT,
  driver_name VARCHAR,
  driver_phone VARCHAR,
  driver_vehicle_number VARCHAR,
  completed_at TIMESTAMPTZ,
  platform_margin NUMERIC DEFAULT 0.00,
  applied_zone VARCHAR,
  driver_lat NUMERIC,
  driver_lng NUMERIC,
  driver_heading NUMERIC DEFAULT 0,
  search_radius_km NUMERIC DEFAULT 3.0
);

-- driver_wallets
CREATE TABLE IF NOT EXISTS public.driver_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID UNIQUE REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  today_earnings NUMERIC NOT NULL DEFAULT 0.00,
  total_balance NUMERIC NOT NULL DEFAULT 0.00,
  last_withdrawn_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- payout_requests
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  upi_id TEXT NOT NULL,
  status public.payout_status NOT NULL DEFAULT 'pending'::public.payout_status,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- driver_payout_requests
CREATE TABLE IF NOT EXISTS public.driver_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ
);

-- drivers (legacy table)
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  vehicle_type TEXT DEFAULT 'Sedan',
  vehicle_number TEXT,
  vehicle_model TEXT,
  license_number TEXT,
  kyc_status TEXT DEFAULT 'pending_upload'
    CHECK (kyc_status = ANY (ARRAY['pending_upload','submitted','pending_review','approved','rejected'])),
  dl_document_url TEXT,
  rc_document_url TEXT,
  insurance_document_url TEXT,
  is_online BOOLEAN DEFAULT false,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  last_location_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  wallet_balance NUMERIC DEFAULT 0.00
);

-- driver_withdrawals
CREATE TABLE IF NOT EXISTS public.driver_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_name TEXT,
  driver_phone TEXT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payout_method TEXT DEFAULT 'UPI',
  upi_id TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending','approved','rejected','processed'])),
  admin_notes TEXT,
  transaction_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  bank_name TEXT
);

-- ============================================================
-- STEP 3: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON public.driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_approval_status ON public.driver_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_online ON public.driver_profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_user_id ON public.vendor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_vendor_id ON public.trips(vendor_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON public.trips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_wallets_driver_id ON public.driver_wallets(driver_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_driver_id ON public.payout_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_payout_requests_driver_id ON public.driver_payout_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_withdrawals_driver_id ON public.driver_withdrawals(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_withdrawals_user_id ON public.driver_withdrawals(user_id);

-- ============================================================
-- STEP 4: FUNCTIONS (must be before RLS policies)
-- ============================================================

-- Auto-create user_profiles on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- RPC: Get driver profile with wallet info
CREATE OR REPLACE FUNCTION public.get_driver_with_wallet(p_user_id UUID)
RETURNS TABLE(
  driver_id UUID,
  user_id UUID,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  vehicle_type TEXT,
  vehicle_model TEXT,
  vehicle_number TEXT,
  approval_status TEXT,
  is_online BOOLEAN,
  is_approved BOOLEAN,
  wallet_balance NUMERIC,
  today_earnings NUMERIC,
  total_balance NUMERIC,
  profile_photo_url TEXT,
  upi_id TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.id AS driver_id,
    dp.user_id,
    dp.full_name,
    dp.phone,
    dp.email,
    dp.vehicle_type::TEXT,
    dp.vehicle_model,
    dp.vehicle_number::TEXT,
    dp.approval_status,
    dp.is_online,
    dp.is_approved,
    dp.wallet_balance,
    COALESCE(dw.today_earnings, 0.00) AS today_earnings,
    COALESCE(dw.total_balance, 0.00) AS total_balance,
    dp.profile_photo_url,
    dp.upi_id,
    dp.bank_account_number,
    dp.bank_ifsc,
    dp.bank_name
  FROM public.driver_profiles dp
  LEFT JOIN public.driver_wallets dw ON dw.driver_id = dp.id
  WHERE dp.user_id = p_user_id
  LIMIT 1;
END;
$$;

-- RPC: Get driver trips summary
CREATE OR REPLACE FUNCTION public.get_driver_trips_summary(p_driver_id UUID)
RETURNS TABLE(
  total_trips BIGINT,
  completed_trips BIGINT,
  cancelled_trips BIGINT,
  total_earnings NUMERIC,
  this_month_trips BIGINT,
  this_month_earnings NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_trips,
    COUNT(*) FILTER (WHERE t.status = 'completed'::public.trip_status)::BIGINT AS completed_trips,
    COUNT(*) FILTER (WHERE t.status = 'cancelled'::public.trip_status)::BIGINT AS cancelled_trips,
    COALESCE(SUM(t.driver_payout) FILTER (WHERE t.status = 'completed'::public.trip_status), 0.00) AS total_earnings,
    COUNT(*) FILTER (
      WHERE t.status = 'completed'::public.trip_status
      AND date_trunc('month', t.completed_at) = date_trunc('month', now())
    )::BIGINT AS this_month_trips,
    COALESCE(SUM(t.driver_payout) FILTER (
      WHERE t.status = 'completed'::public.trip_status
      AND date_trunc('month', t.completed_at) = date_trunc('month', now())
    ), 0.00) AS this_month_earnings
  FROM public.trips t
  WHERE t.driver_id = p_driver_id;
END;
$$;

-- RPC: Toggle driver online status
CREATE OR REPLACE FUNCTION public.toggle_driver_online(p_user_id UUID, p_is_online BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE public.driver_profiles
  SET is_online = p_is_online, updated_at = now()
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

-- RPC: Accept trip
CREATE OR REPLACE FUNCTION public.accept_trip(p_trip_id UUID, p_driver_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated INTEGER;
  v_driver public.driver_profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_driver FROM public.driver_profiles WHERE id = p_driver_id LIMIT 1;
  IF v_driver.id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.trips
  SET
    driver_id = p_driver_id,
    status = 'assigned'::public.trip_status,
    driver_name = v_driver.full_name,
    driver_phone = v_driver.phone,
    driver_vehicle_number = v_driver.vehicle_number,
    updated_at = now()
  WHERE id = p_trip_id
    AND status = 'broadcasting'::public.trip_status
    AND driver_id IS NULL;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

-- RPC: Complete trip and credit wallet
CREATE OR REPLACE FUNCTION public.complete_trip(p_trip_id UUID, p_driver_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip public.trips%ROWTYPE;
  rows_updated INTEGER;
BEGIN
  SELECT * INTO v_trip FROM public.trips
  WHERE id = p_trip_id AND driver_id = p_driver_id LIMIT 1;

  IF v_trip.id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.trips
  SET
    status = 'completed'::public.trip_status,
    completed_at = now(),
    trip_ended_at = now(),
    updated_at = now()
  WHERE id = p_trip_id;

  -- Credit driver wallet
  INSERT INTO public.driver_wallets (driver_id, today_earnings, total_balance, updated_at)
  VALUES (p_driver_id, COALESCE(v_trip.driver_payout, 0), COALESCE(v_trip.driver_payout, 0), now())
  ON CONFLICT (driver_id) DO UPDATE
  SET
    today_earnings = public.driver_wallets.today_earnings + COALESCE(v_trip.driver_payout, 0),
    total_balance = public.driver_wallets.total_balance + COALESCE(v_trip.driver_payout, 0),
    updated_at = now();

  -- Update driver_profiles wallet_balance
  UPDATE public.driver_profiles
  SET wallet_balance = wallet_balance + COALESCE(v_trip.driver_payout, 0),
      updated_at = now()
  WHERE id = p_driver_id;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

-- ============================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_withdrawals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 6: RLS POLICIES
-- ============================================================

-- user_profiles
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- driver_profiles: drivers manage their own profile
DROP POLICY IF EXISTS "drivers_manage_own_profile" ON public.driver_profiles;
CREATE POLICY "drivers_manage_own_profile"
ON public.driver_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- driver_profiles: authenticated users can read approved drivers (for trip assignment)
DROP POLICY IF EXISTS "authenticated_read_approved_drivers" ON public.driver_profiles;
CREATE POLICY "authenticated_read_approved_drivers"
ON public.driver_profiles
FOR SELECT
TO authenticated
USING (is_approved = true);

-- vendor_profiles
DROP POLICY IF EXISTS "vendors_manage_own_profile" ON public.vendor_profiles;
CREATE POLICY "vendors_manage_own_profile"
ON public.vendor_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- trips: vendors can manage their own trips
DROP POLICY IF EXISTS "vendors_manage_own_trips" ON public.trips;
CREATE POLICY "vendors_manage_own_trips"
ON public.trips
FOR ALL
TO authenticated
USING (vendor_id = auth.uid())
WITH CHECK (vendor_id = auth.uid());

-- trips: drivers can view and update assigned trips
DROP POLICY IF EXISTS "drivers_view_assigned_trips" ON public.trips;
CREATE POLICY "drivers_view_assigned_trips"
ON public.trips
FOR SELECT
TO authenticated
USING (
  driver_id IN (
    SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "drivers_update_assigned_trips" ON public.trips;
CREATE POLICY "drivers_update_assigned_trips"
ON public.trips
FOR UPDATE
TO authenticated
USING (
  driver_id IN (
    SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  driver_id IN (
    SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
  )
);

-- trips: drivers can view broadcasting trips to accept
DROP POLICY IF EXISTS "drivers_view_broadcasting_trips" ON public.trips;
CREATE POLICY "drivers_view_broadcasting_trips"
ON public.trips
FOR SELECT
TO authenticated
USING (trips.status = 'broadcasting'::public.trip_status);

-- driver_wallets
DROP POLICY IF EXISTS "drivers_manage_own_wallet" ON public.driver_wallets;
CREATE POLICY "drivers_manage_own_wallet"
ON public.driver_wallets
FOR ALL
TO authenticated
USING (
  driver_id IN (
    SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  driver_id IN (
    SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
  )
);

-- payout_requests
DROP POLICY IF EXISTS "drivers_manage_own_payout_requests" ON public.payout_requests;
CREATE POLICY "drivers_manage_own_payout_requests"
ON public.payout_requests
FOR ALL
TO authenticated
USING (
  driver_id IN (
    SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  driver_id IN (
    SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
  )
);

-- driver_payout_requests
DROP POLICY IF EXISTS "drivers_manage_own_driver_payout_requests" ON public.driver_payout_requests;
CREATE POLICY "drivers_manage_own_driver_payout_requests"
ON public.driver_payout_requests
FOR ALL
TO authenticated
USING (
  driver_id IN (
    SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  driver_id IN (
    SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
  )
);

-- drivers (legacy)
DROP POLICY IF EXISTS "drivers_manage_own_drivers" ON public.drivers;
CREATE POLICY "drivers_manage_own_drivers"
ON public.drivers
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- driver_withdrawals
DROP POLICY IF EXISTS "drivers_manage_own_withdrawals" ON public.driver_withdrawals;
CREATE POLICY "drivers_manage_own_withdrawals"
ON public.driver_withdrawals
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- STEP 7: TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_driver_profiles_updated_at ON public.driver_profiles;
CREATE TRIGGER set_driver_profiles_updated_at
  BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_trips_updated_at ON public.trips;
CREATE TRIGGER set_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_driver_wallets_updated_at ON public.driver_wallets;
CREATE TRIGGER set_driver_wallets_updated_at
  BEFORE UPDATE ON public.driver_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- STEP 8: STORAGE BUCKET - driver-documents
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-documents',
  'driver-documents',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policies for driver-documents bucket
DROP POLICY IF EXISTS "drivers_upload_own_documents" ON storage.objects;
CREATE POLICY "drivers_upload_own_documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "drivers_read_own_documents" ON storage.objects;
CREATE POLICY "drivers_read_own_documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "public_read_driver_documents" ON storage.objects;
CREATE POLICY "public_read_driver_documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'driver-documents');

DROP POLICY IF EXISTS "drivers_update_own_documents" ON storage.objects;
CREATE POLICY "drivers_update_own_documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
)
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "drivers_delete_own_documents" ON storage.objects;
CREATE POLICY "drivers_delete_own_documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);
