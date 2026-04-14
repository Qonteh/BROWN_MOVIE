SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';
DROP FUNCTION IF EXISTS public.increment_failed_login_attempts(p_user_id uuid);
CREATE FUNCTION public.increment_failed_login_attempts(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_attempts INTEGER;
BEGIN
    SELECT failed_login_attempts
    INTO current_attempts
    FROM users
    WHERE id = p_user_id;
    UPDATE users
    SET
        failed_login_attempts = COALESCE(current_attempts, 0) + 1,
        locked_until = CASE
            WHEN COALESCE(current_attempts, 0) + 1 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
            ELSE locked_until
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
END;
$$;
DROP FUNCTION IF EXISTS public.mark_user_login(p_user_id uuid);
CREATE FUNCTION public.mark_user_login(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE users
    SET
        last_login_at = CURRENT_TIMESTAMP,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
END;
$$;
DROP FUNCTION IF EXISTS public.update_auth_updated_at();
CREATE FUNCTION public.update_auth_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
DROP FUNCTION IF EXISTS public.update_movie_rating();
CREATE FUNCTION public.update_movie_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE movies
    SET
        rating = (SELECT AVG(rating)::DECIMAL(3,1) FROM reviews WHERE movie_id = NEW.movie_id AND is_approved = true),
        total_ratings = (SELECT COUNT(*) FROM reviews WHERE movie_id = NEW.movie_id AND is_approved = true),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.movie_id;
    RETURN NEW;
END;
$$;
DROP FUNCTION IF EXISTS public.update_updated_at();
CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
SET default_tablespace = '';
SET default_table_access_method = heap;
CREATE TABLE public.auth_audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(50) NOT NULL,
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.auth_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    session_token character varying(255) NOT NULL,
    refresh_token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    ip_address character varying(45),
    user_agent text,
    device_name character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    name_sw character varying(100),
    slug character varying(100) NOT NULL,
    description text,
    image_url text,
    icon character varying(50),
    parent_id uuid,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.email_verification_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.hero_slides (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    movie_id uuid,
    title character varying(255) NOT NULL,
    subtitle character varying(255),
    description text,
    image_url text NOT NULL,
    cta_text character varying(100) DEFAULT 'Download'::character varying,
    cta_link text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    trailer_link text,
    download_link text,
    price numeric(10,2)
);
CREATE TABLE public.login_attempts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    user_id uuid,
    success boolean DEFAULT false NOT NULL,
    failure_reason character varying(100),
    ip_address character varying(45),
    user_agent text,
    attempted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.movie_categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    movie_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.movie_episodes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    movie_id uuid NOT NULL,
    season_id uuid NOT NULL,
    episode_title character varying(255) NOT NULL,
    episode_number integer NOT NULL,
    download_url text NOT NULL,
    sort_order integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT movie_episodes_episode_number_check CHECK ((episode_number >= 1))
);
CREATE TABLE public.movie_parts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    movie_id uuid NOT NULL,
    part_title character varying(255) NOT NULL,
    part_number integer NOT NULL,
    download_url text NOT NULL,
    sort_order integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT movie_parts_part_number_check CHECK ((part_number >= 1))
);
CREATE TABLE public.movie_seasons (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    movie_id uuid NOT NULL,
    season_title character varying(255) NOT NULL,
    season_number integer NOT NULL,
    sort_order integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT movie_seasons_season_number_check CHECK ((season_number >= 1))
);
CREATE TABLE public.movies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    poster_url text NOT NULL,
    backdrop_url text,
    trailer_url text,
    download_url text,
    price numeric(10,2) DEFAULT 1000.00 NOT NULL,
    currency character varying(10) DEFAULT 'TSH'::character varying,
    release_year integer,
    duration_minutes integer,
    rating numeric(3,1) DEFAULT 0.0,
    total_ratings integer DEFAULT 0,
    quality character varying(20) DEFAULT 'HD'::character varying,
    language character varying(50) DEFAULT 'English'::character varying,
    subtitles text[],
    is_featured boolean DEFAULT false,
    is_new boolean DEFAULT false,
    is_trending boolean DEFAULT false,
    view_count integer DEFAULT 0,
    download_count integer DEFAULT 0,
    content_type character varying(20) DEFAULT 'movie'::character varying,
    episodes_count integer DEFAULT 1,
    seasons_count integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT movies_content_type_check CHECK (((content_type)::text = ANY ((ARRAY['movie'::character varying, 'series'::character varying])::text[])))
);
CREATE VIEW public.movies_with_categories AS
SELECT
    NULL::uuid AS id,
    NULL::character varying(255) AS title,
    NULL::character varying(255) AS slug,
    NULL::text AS description,
    NULL::text AS poster_url,
    NULL::text AS backdrop_url,
    NULL::text AS trailer_url,
    NULL::text AS download_url,
    NULL::numeric(10,2) AS price,
    NULL::character varying(10) AS currency,
    NULL::integer AS release_year,
    NULL::integer AS duration_minutes,
    NULL::numeric(3,1) AS rating,
    NULL::integer AS total_ratings,
    NULL::character varying(20) AS quality,
    NULL::character varying(50) AS language,
    NULL::text[] AS subtitles,
    NULL::boolean AS is_featured,
    NULL::boolean AS is_new,
    NULL::boolean AS is_trending,
    NULL::integer AS view_count,
    NULL::integer AS download_count,
    NULL::character varying(20) AS content_type,
    NULL::integer AS episodes_count,
    NULL::integer AS seasons_count,
    NULL::boolean AS is_active,
    NULL::uuid AS created_by,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::character varying[] AS category_names,
    NULL::character varying[] AS category_slugs;
CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    requested_ip character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE VIEW public.popular_movies AS
SELECT
    NULL::uuid AS id,
    NULL::character varying(255) AS title,
    NULL::character varying(255) AS slug,
    NULL::text AS description,
    NULL::text AS poster_url,
    NULL::text AS backdrop_url,
    NULL::text AS trailer_url,
    NULL::text AS download_url,
    NULL::numeric(10,2) AS price,
    NULL::character varying(10) AS currency,
    NULL::integer AS release_year,
    NULL::integer AS duration_minutes,
    NULL::numeric(3,1) AS rating,
    NULL::integer AS total_ratings,
    NULL::character varying(20) AS quality,
    NULL::character varying(50) AS language,
    NULL::text[] AS subtitles,
    NULL::boolean AS is_featured,
    NULL::boolean AS is_new,
    NULL::boolean AS is_trending,
    NULL::integer AS view_count,
    NULL::integer AS download_count,
    NULL::character varying(20) AS content_type,
    NULL::integer AS episodes_count,
    NULL::integer AS seasons_count,
    NULL::boolean AS is_active,
    NULL::uuid AS created_by,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::bigint AS purchase_count,
    NULL::numeric AS total_revenue;
CREATE TABLE public.purchases (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    movie_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'TSH'::character varying,
    payment_method character varying(50) NOT NULL,
    payment_phone character varying(20),
    transaction_id character varying(100),
    status character varying(20) DEFAULT 'pending'::character varying,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchases_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))
);
CREATE VIEW public.purchase_stats AS
 SELECT date(created_at) AS date,
    count(*) AS total_purchases,
    sum(amount) AS total_revenue,
    count(DISTINCT user_id) AS unique_buyers
   FROM public.purchases
  WHERE ((status)::text = 'completed'::text)
  GROUP BY (date(created_at))
  ORDER BY (date(created_at)) DESC;
CREATE TABLE public.reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    movie_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    is_approved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);
CREATE TABLE public.sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    type character varying(20) DEFAULT 'string'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    phone_number character varying(20),
    role character varying(20) DEFAULT 'user'::character varying,
    avatar_url text,
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_login_at timestamp with time zone,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    password_changed_at timestamp with time zone,
    reset_token_expires_at timestamp with time zone,
    reset_token_used boolean DEFAULT false,
    verification_token_expires_at timestamp with time zone,
    verification_token_used boolean DEFAULT false,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[])))
);
CREATE TABLE public.watchlist (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    movie_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE ONLY public.auth_audit_logs
    ADD CONSTRAINT auth_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_refresh_token_hash_key UNIQUE (refresh_token_hash);
ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_session_token_key UNIQUE (session_token);
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_hash_key UNIQUE (token_hash);
ALTER TABLE ONLY public.hero_slides
    ADD CONSTRAINT hero_slides_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.movie_categories
    ADD CONSTRAINT movie_categories_movie_id_category_id_key UNIQUE (movie_id, category_id);
ALTER TABLE ONLY public.movie_categories
    ADD CONSTRAINT movie_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.movie_episodes
    ADD CONSTRAINT movie_episodes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.movie_episodes
    ADD CONSTRAINT movie_episodes_season_id_episode_number_key UNIQUE (season_id, episode_number);
ALTER TABLE ONLY public.movie_parts
    ADD CONSTRAINT movie_parts_movie_id_part_number_key UNIQUE (movie_id, part_number);
ALTER TABLE ONLY public.movie_parts
    ADD CONSTRAINT movie_parts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.movie_seasons
    ADD CONSTRAINT movie_seasons_movie_id_season_number_key UNIQUE (movie_id, season_number);
ALTER TABLE ONLY public.movie_seasons
    ADD CONSTRAINT movie_seasons_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.movies
    ADD CONSTRAINT movies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.movies
    ADD CONSTRAINT movies_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);
ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_movie_id_key UNIQUE (user_id, movie_id);
ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_key UNIQUE (token);
ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);
ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_user_id_movie_id_key UNIQUE (user_id, movie_id);
CREATE INDEX idx_auth_audit_logs_action ON public.auth_audit_logs USING btree (action);
CREATE INDEX idx_auth_audit_logs_created_at ON public.auth_audit_logs USING btree (created_at DESC);
CREATE INDEX idx_auth_audit_logs_user_id ON public.auth_audit_logs USING btree (user_id);
CREATE INDEX idx_auth_sessions_expires_at ON public.auth_sessions USING btree (expires_at);
CREATE INDEX idx_auth_sessions_refresh_token_hash ON public.auth_sessions USING btree (refresh_token_hash);
CREATE INDEX idx_auth_sessions_token ON public.auth_sessions USING btree (session_token);
CREATE INDEX idx_auth_sessions_user_id ON public.auth_sessions USING btree (user_id);
CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);
CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);
CREATE INDEX idx_email_verification_tokens_expires_at ON public.email_verification_tokens USING btree (expires_at);
CREATE INDEX idx_email_verification_tokens_token_hash ON public.email_verification_tokens USING btree (token_hash);
CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens USING btree (user_id);
CREATE INDEX idx_hero_slides_active ON public.hero_slides USING btree (is_active);
CREATE INDEX idx_hero_slides_order ON public.hero_slides USING btree (sort_order);
CREATE INDEX idx_login_attempts_attempted_at ON public.login_attempts USING btree (attempted_at DESC);
CREATE INDEX idx_login_attempts_email ON public.login_attempts USING btree (email);
CREATE INDEX idx_login_attempts_user_id ON public.login_attempts USING btree (user_id);
CREATE INDEX idx_movie_categories_category ON public.movie_categories USING btree (category_id);
CREATE INDEX idx_movie_categories_movie ON public.movie_categories USING btree (movie_id);
CREATE INDEX idx_movie_episodes_movie_id ON public.movie_episodes USING btree (movie_id);
CREATE INDEX idx_movie_episodes_season_id ON public.movie_episodes USING btree (season_id);
CREATE INDEX idx_movie_parts_movie_id ON public.movie_parts USING btree (movie_id);
CREATE INDEX idx_movie_seasons_movie_id ON public.movie_seasons USING btree (movie_id);
CREATE INDEX idx_movies_content_type ON public.movies USING btree (content_type);
CREATE INDEX idx_movies_created_at ON public.movies USING btree (created_at DESC);
CREATE INDEX idx_movies_is_featured ON public.movies USING btree (is_featured);
CREATE INDEX idx_movies_is_new ON public.movies USING btree (is_new);
CREATE INDEX idx_movies_slug ON public.movies USING btree (slug);
CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens USING btree (expires_at);
CREATE INDEX idx_password_reset_tokens_token_hash ON public.password_reset_tokens USING btree (token_hash);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);
CREATE INDEX idx_purchases_created_at ON public.purchases USING btree (created_at DESC);
CREATE INDEX idx_purchases_movie ON public.purchases USING btree (movie_id);
CREATE INDEX idx_purchases_status ON public.purchases USING btree (status);
CREATE INDEX idx_purchases_user ON public.purchases USING btree (user_id);
CREATE INDEX idx_reviews_movie ON public.reviews USING btree (movie_id);
CREATE INDEX idx_reviews_user ON public.reviews USING btree (user_id);
CREATE INDEX idx_sessions_expires ON public.sessions USING btree (expires_at);
CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);
CREATE INDEX idx_sessions_user ON public.sessions USING btree (user_id);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_last_login_at ON public.users USING btree (last_login_at);
CREATE INDEX idx_users_locked_until ON public.users USING btree (locked_until);
CREATE INDEX idx_users_role ON public.users USING btree (role);
CREATE INDEX idx_watchlist_user ON public.watchlist USING btree (user_id);
CREATE OR REPLACE VIEW public.movies_with_categories AS
 SELECT m.id,
    m.title,
    m.slug,
    m.description,
    m.poster_url,
    m.backdrop_url,
    m.trailer_url,
    m.download_url,
    m.price,
    m.currency,
    m.release_year,
    m.duration_minutes,
    m.rating,
    m.total_ratings,
    m.quality,
    m.language,
    m.subtitles,
    m.is_featured,
    m.is_new,
    m.is_trending,
    m.view_count,
    m.download_count,
    m.content_type,
    m.episodes_count,
    m.seasons_count,
    m.is_active,
    m.created_by,
    m.created_at,
    m.updated_at,
    array_agg(DISTINCT c.name) AS category_names,
    array_agg(DISTINCT c.slug) AS category_slugs
   FROM ((public.movies m
     LEFT JOIN public.movie_categories mc ON ((m.id = mc.movie_id)))
     LEFT JOIN public.categories c ON ((mc.category_id = c.id)))
  GROUP BY m.id;
CREATE OR REPLACE VIEW public.popular_movies AS
 SELECT m.id,
    m.title,
    m.slug,
    m.description,
    m.poster_url,
    m.backdrop_url,
    m.trailer_url,
    m.download_url,
    m.price,
    m.currency,
    m.release_year,
    m.duration_minutes,
    m.rating,
    m.total_ratings,
    m.quality,
    m.language,
    m.subtitles,
    m.is_featured,
    m.is_new,
    m.is_trending,
    m.view_count,
    m.download_count,
    m.content_type,
    m.episodes_count,
    m.seasons_count,
    m.is_active,
    m.created_by,
    m.created_at,
    m.updated_at,
    count(p.id) AS purchase_count,
    sum(p.amount) AS total_revenue
   FROM (public.movies m
     LEFT JOIN public.purchases p ON (((m.id = p.movie_id) AND ((p.status)::text = 'completed'::text))))
  GROUP BY m.id
  ORDER BY (count(p.id)) DESC;
CREATE TRIGGER trigger_update_movie_rating AFTER INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_movie_rating();
CREATE TRIGGER update_auth_sessions_updated_at BEFORE UPDATE ON public.auth_sessions FOR EACH ROW EXECUTE FUNCTION public.update_auth_updated_at();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON public.movies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE ONLY public.auth_audit_logs
    ADD CONSTRAINT auth_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.hero_slides
    ADD CONSTRAINT hero_slides_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.movie_categories
    ADD CONSTRAINT movie_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.movie_categories
    ADD CONSTRAINT movie_categories_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.movie_episodes
    ADD CONSTRAINT movie_episodes_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.movie_episodes
    ADD CONSTRAINT movie_episodes_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.movie_seasons(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.movie_parts
    ADD CONSTRAINT movie_parts_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.movie_seasons
    ADD CONSTRAINT movie_seasons_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.movies
    ADD CONSTRAINT movies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

