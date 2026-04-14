-- =============================================
-- BROWN MOVIES - PostgreSQL Database Schema
-- Run this in pgAdmin to create all tables
-- =============================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster email lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =============================================
-- 2. CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_sw VARCHAR(100), -- Swahili name
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    icon VARCHAR(50),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- =============================================
-- 3. MOVIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    poster_url TEXT NOT NULL,
    backdrop_url TEXT,
    trailer_url TEXT,
    download_url TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 1000.00,
    currency VARCHAR(10) DEFAULT 'TSH',
    release_year INTEGER,
    duration_minutes INTEGER,
    rating DECIMAL(3, 1) DEFAULT 0.0,
    total_ratings INTEGER DEFAULT 0,
    quality VARCHAR(20) DEFAULT 'HD',
    language VARCHAR(50) DEFAULT 'English',
    subtitles TEXT[], -- Array of available subtitle languages
    is_featured BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    content_type VARCHAR(20) DEFAULT 'movie' CHECK (content_type IN ('movie', 'series')),
    episodes_count INTEGER DEFAULT 1,
    seasons_count INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movies_slug ON movies(slug);
CREATE INDEX idx_movies_content_type ON movies(content_type);
CREATE INDEX idx_movies_is_featured ON movies(is_featured);
CREATE INDEX idx_movies_is_new ON movies(is_new);
CREATE INDEX idx_movies_created_at ON movies(created_at DESC);

-- =============================================
-- 4. MOVIE MEDIA TABLES (Parts / Seasons / Episodes)
-- =============================================
CREATE TABLE IF NOT EXISTS movie_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    part_title VARCHAR(255) NOT NULL,
    part_number INTEGER NOT NULL CHECK (part_number >= 1),
    download_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(movie_id, part_number)
);

CREATE INDEX idx_movie_parts_movie_id ON movie_parts(movie_id);

CREATE TABLE IF NOT EXISTS movie_seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    season_title VARCHAR(255) NOT NULL,
    season_number INTEGER NOT NULL CHECK (season_number >= 1),
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(movie_id, season_number)
);

CREATE INDEX idx_movie_seasons_movie_id ON movie_seasons(movie_id);

CREATE TABLE IF NOT EXISTS movie_episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES movie_seasons(id) ON DELETE CASCADE,
    episode_title VARCHAR(255) NOT NULL,
    episode_number INTEGER NOT NULL CHECK (episode_number >= 1),
    download_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(season_id, episode_number)
);

CREATE INDEX idx_movie_episodes_movie_id ON movie_episodes(movie_id);
CREATE INDEX idx_movie_episodes_season_id ON movie_episodes(season_id);

-- =============================================
-- 5. MOVIE_CATEGORIES (Many-to-Many Relationship)
-- =============================================
CREATE TABLE IF NOT EXISTS movie_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(movie_id, category_id)
);

CREATE INDEX idx_movie_categories_movie ON movie_categories(movie_id);
CREATE INDEX idx_movie_categories_category ON movie_categories(category_id);

-- =============================================
-- 6. PURCHASES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'TSH',
    payment_method VARCHAR(50) NOT NULL,
    payment_phone VARCHAR(20),
    transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_movie ON purchases(movie_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_created_at ON purchases(created_at DESC);

-- =============================================
-- 6. HERO SLIDES TABLE (For Homepage Carousel)
-- =============================================
CREATE TABLE IF NOT EXISTS hero_slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    image_url TEXT NOT NULL,
    cta_text VARCHAR(100) DEFAULT 'Download',
    cta_link TEXT,
    trailer_link TEXT,
    download_link TEXT,
    price NUMERIC(10,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hero_slides_active ON hero_slides(is_active);
CREATE INDEX idx_hero_slides_order ON hero_slides(sort_order);

-- =============================================
-- 7. REVIEWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, movie_id)
);

CREATE INDEX idx_reviews_movie ON reviews(movie_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);

-- =============================================
-- 8. WATCHLIST TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, movie_id)
);

CREATE INDEX idx_watchlist_user ON watchlist(user_id);

-- =============================================
-- 9. SESSIONS TABLE (For Authentication)
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- =============================================
-- 10. SETTINGS TABLE (Site Configuration)
-- =============================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INSERT DEFAULT CATEGORIES
-- =============================================
INSERT INTO categories (name, name_sw, slug, icon, sort_order) VALUES
-- Main Movie Categories
('New This Week', 'Mpya za Wiki', 'mpya-za-wiki', 'Sparkles', 1),
('Cartoons', 'Katuni', 'katuni', 'Baby', 2),
('Action', 'Action', 'action', 'Swords', 3),
('War', 'Kivita', 'kivita', 'Shield', 4),
('Thriller', 'Kusisimua', 'kusisimua', 'Zap', 5),
('Bollywood', 'Wahindi', 'wahindi', 'Music', 6),
('Romance', 'Mapenzi', 'mapenzi', 'Heart', 7),
('Comedy', 'Kuchekesha', 'kuchekesha', 'Laugh', 8),
('Horror', 'Kutisha', 'kutisha', 'Ghost', 9),
('African', 'Afrika', 'afrika', 'Globe', 10),
('Documentary', 'Documentary', 'documentary', 'Film', 11),
('Anime', 'Anime', 'anime', 'Sparkle', 12),
('Kids', 'Watoto', 'watoto', 'Gamepad', 13),
('Seasons', 'Season', 'season', 'Tv', 14)
ON CONFLICT (slug) DO NOTHING;

-- Season Sub-Categories
INSERT INTO categories (name, name_sw, slug, icon, parent_id, sort_order) 
SELECT 'Korean Drama', 'Season za Korea', 'korean-drama', 'Flag', id, 1 FROM categories WHERE slug = 'season'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, name_sw, slug, icon, parent_id, sort_order) 
SELECT 'Chinese Drama', 'Season za Kichina', 'chinese-drama', 'Flag', id, 2 FROM categories WHERE slug = 'season'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, name_sw, slug, icon, parent_id, sort_order) 
SELECT 'Indian Series', 'Season za Kihindi', 'indian-series', 'Flag', id, 3 FROM categories WHERE slug = 'season'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, name_sw, slug, icon, parent_id, sort_order) 
SELECT 'Western Series', 'Season za Kizungu', 'western-series', 'Flag', id, 4 FROM categories WHERE slug = 'season'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, name_sw, slug, icon, parent_id, sort_order) 
SELECT 'Turkish Series', 'Season za Kituruki', 'turkish-series', 'Flag', id, 5 FROM categories WHERE slug = 'season'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, name_sw, slug, icon, parent_id, sort_order) 
SELECT 'Spanish Series', 'Season za Kihispania', 'spanish-series', 'Flag', id, 6 FROM categories WHERE slug = 'season'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, name_sw, slug, icon, parent_id, sort_order) 
SELECT 'Thai Series', 'Season za Thailand', 'thai-series', 'Flag', id, 7 FROM categories WHERE slug = 'season'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, name_sw, slug, icon, parent_id, sort_order) 
SELECT 'Filipino Series', 'Season za Ufilipino', 'filipino-series', 'Flag', id, 8 FROM categories WHERE slug = 'season'
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- INSERT DEFAULT ADMIN USER
-- Password: admin123 (bcrypt hashed)
-- =============================================
INSERT INTO users (email, password_hash, full_name, role, phone_number, email_verified)
VALUES (
    'admin@brownmovies.com',
    '$2b$10$rKN3XZK6U8z5wQxj4z5jXeX5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X',
    'Brown Movies Admin',
    'admin',
    '0700000000',
    true
) ON CONFLICT (email) DO NOTHING;

-- =============================================
-- INSERT DEFAULT SETTINGS
-- =============================================
INSERT INTO settings (key, value, type, description) VALUES
('site_name', 'Brown Movies', 'string', 'Website name'),
('site_tagline', 'Your Ultimate Movie Destination', 'string', 'Website tagline'),
('default_currency', 'TSH', 'string', 'Default currency for prices'),
('mpesa_enabled', 'true', 'boolean', 'Enable M-Pesa payments'),
('airtel_enabled', 'true', 'boolean', 'Enable Airtel Money payments'),
('halopesa_enabled', 'true', 'boolean', 'Enable HaloPesa payments'),
('mixx_enabled', 'true', 'boolean', 'Enable MiXX payments'),
('card_enabled', 'true', 'boolean', 'Enable card payments'),
('contact_email', 'support@brownmovies.com', 'string', 'Contact email'),
('contact_phone', '+255 700 000 000', 'string', 'Contact phone')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- HELPFUL VIEWS
-- =============================================

-- View for movies with their categories
CREATE OR REPLACE VIEW movies_with_categories AS
SELECT 
    m.*,
    ARRAY_AGG(DISTINCT c.name) as category_names,
    ARRAY_AGG(DISTINCT c.slug) as category_slugs
FROM movies m
LEFT JOIN movie_categories mc ON m.id = mc.movie_id
LEFT JOIN categories c ON mc.category_id = c.id
GROUP BY m.id;

-- View for purchase statistics
CREATE OR REPLACE VIEW purchase_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_purchases,
    SUM(amount) as total_revenue,
    COUNT(DISTINCT user_id) as unique_buyers
FROM purchases
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View for popular movies
CREATE OR REPLACE VIEW popular_movies AS
SELECT 
    m.*,
    COUNT(p.id) as purchase_count,
    SUM(p.amount) as total_revenue
FROM movies m
LEFT JOIN purchases p ON m.id = p.movie_id AND p.status = 'completed'
GROUP BY m.id
ORDER BY purchase_count DESC;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update movie rating when new review is added
CREATE OR REPLACE FUNCTION update_movie_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE movies
    SET 
        rating = (SELECT AVG(rating)::DECIMAL(3,1) FROM reviews WHERE movie_id = NEW.movie_id AND is_approved = true),
        total_ratings = (SELECT COUNT(*) FROM reviews WHERE movie_id = NEW.movie_id AND is_approved = true),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.movie_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating movie rating
DROP TRIGGER IF EXISTS trigger_update_movie_rating ON reviews;
CREATE TRIGGER trigger_update_movie_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_movie_rating();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON movies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- GRANT PERMISSIONS (adjust as needed)
-- =============================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'BROWN MOVIES Database Setup Complete!';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Tables created: users, categories, movies, movie_categories, purchases, hero_slides, reviews, watchlist, sessions, settings';
    RAISE NOTICE 'Default admin: admin@brownmovies.com';
    RAISE NOTICE '=============================================';
END $$;
