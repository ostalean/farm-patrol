-- Create enum for alert status
CREATE TYPE public.alert_status AS ENUM ('active', 'triggered', 'resolved');

-- Tenants table (farms/organizations)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tractors table
CREATE TABLE public.tractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    identifier TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    last_lat DOUBLE PRECISION,
    last_lon DOUBLE PRECISION,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tractors ENABLE ROW LEVEL SECURITY;

-- Blocks (cuarteles) table
CREATE TABLE public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    farm_name TEXT,
    crop TEXT,
    geometry_geojson JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- GPS Pings table
CREATE TABLE public.gps_pings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    tractor_id UUID REFERENCES public.tractors(id) ON DELETE CASCADE NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gps_pings ENABLE ROW LEVEL SECURITY;

-- Create index for efficient querying
CREATE INDEX idx_gps_pings_tractor_ts ON public.gps_pings(tractor_id, ts DESC);
CREATE INDEX idx_gps_pings_tenant_ts ON public.gps_pings(tenant_id, ts DESC);

-- Block visits (pasadas) table
CREATE TABLE public.block_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL,
    tractor_id UUID REFERENCES public.tractors(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    ping_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.block_visits ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_block_visits_block ON public.block_visits(block_id, started_at DESC);

-- Block metrics (aggregated data per block)
CREATE TABLE public.block_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL UNIQUE,
    last_seen_at TIMESTAMPTZ,
    last_tractor_id UUID REFERENCES public.tractors(id) ON DELETE SET NULL,
    total_passes INTEGER DEFAULT 0,
    passes_24h INTEGER DEFAULT 0,
    passes_7d INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.block_metrics ENABLE ROW LEVEL SECURITY;

-- Alerts configuration table
CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL,
    rule_hours INTEGER NOT NULL DEFAULT 48,
    status alert_status NOT NULL DEFAULT 'active',
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Tenants: users can only see their own tenant
CREATE POLICY "Users can view their tenant" ON public.tenants
    FOR SELECT USING (
        id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    );

-- Profiles: users can manage their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tractors: tenant-scoped access
CREATE POLICY "Users can view tenant tractors" ON public.tractors
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage tenant tractors" ON public.tractors
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    );

-- Blocks: tenant-scoped access
CREATE POLICY "Users can view tenant blocks" ON public.blocks
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage tenant blocks" ON public.blocks
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    );

-- GPS Pings: tenant-scoped access
CREATE POLICY "Users can view tenant pings" ON public.gps_pings
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert tenant pings" ON public.gps_pings
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    );

-- Block visits: tenant-scoped access
CREATE POLICY "Users can view tenant visits" ON public.block_visits
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage tenant visits" ON public.block_visits
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    );

-- Block metrics: access via block's tenant
CREATE POLICY "Users can view block metrics" ON public.block_metrics
    FOR SELECT USING (
        block_id IN (
            SELECT id FROM public.blocks 
            WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage block metrics" ON public.block_metrics
    FOR ALL USING (
        block_id IN (
            SELECT id FROM public.blocks 
            WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
        )
    );

-- Alerts: tenant-scoped access
CREATE POLICY "Users can view tenant alerts" ON public.alerts
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage tenant alerts" ON public.alerts
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    );

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_tenant_id UUID;
BEGIN
    -- Create a new tenant for the user
    INSERT INTO public.tenants (name) 
    VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'Mi Fundo'))
    RETURNING id INTO new_tenant_id;
    
    -- Create profile linked to tenant
    INSERT INTO public.profiles (user_id, tenant_id, email, full_name)
    VALUES (
        NEW.id,
        new_tenant_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at
    BEFORE UPDATE ON public.blocks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_block_metrics_updated_at
    BEFORE UPDATE ON public.block_metrics
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();