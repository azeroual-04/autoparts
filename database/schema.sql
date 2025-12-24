-- ============================================================================
-- AUTO PARTS E-COMMERCE PLATFORM - DATABASE SCHEMA
-- PostgreSQL Database Schema for Autodoc/PiecesAuto24-like Platform
-- ============================================================================

-- Enable UUID extension for better ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'customer');

-- Order status tracking
CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL DEFAULT 'customer',
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    phone           VARCHAR(20),
    is_active       BOOLEAN DEFAULT TRUE,
    email_verified  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

COMMENT ON TABLE users IS 'Stores user accounts for both customers and administrators';

-- ============================================================================
-- USER ADDRESSES TABLE
-- ============================================================================

CREATE TABLE user_addresses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_type    VARCHAR(20) DEFAULT 'shipping', -- 'shipping', 'billing'
    is_default      BOOLEAN DEFAULT FALSE,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    street_address  VARCHAR(255) NOT NULL,
    street_address2 VARCHAR(255),
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100),
    postal_code     VARCHAR(20) NOT NULL,
    country         VARCHAR(100) NOT NULL DEFAULT 'France',
    phone           VARCHAR(20),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_addresses
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_type ON user_addresses(address_type);

COMMENT ON TABLE user_addresses IS 'Stores shipping and billing addresses for users';

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================

CREATE TABLE vehicles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make            VARCHAR(100) NOT NULL,  -- e.g., 'Renault', 'Peugeot', 'BMW'
    model           VARCHAR(100) NOT NULL,  -- e.g., 'Clio', '308', 'Serie 3'
    year            INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
    engine_code     VARCHAR(50),            -- e.g., 'K9K', 'N47D20'
    engine_size     DECIMAL(3,1),           -- e.g., 1.5, 2.0 (liters)
    fuel_type       VARCHAR(30),            -- 'petrol', 'diesel', 'electric', 'hybrid'
    body_type       VARCHAR(50),            -- 'sedan', 'hatchback', 'suv', etc.
    doors           INTEGER,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite unique constraint to prevent duplicate vehicle entries
    CONSTRAINT unique_vehicle UNIQUE (make, model, year, engine_code)
);

-- Indexes for vehicles
CREATE INDEX idx_vehicles_make ON vehicles(make);
CREATE INDEX idx_vehicles_model ON vehicles(model);
CREATE INDEX idx_vehicles_year ON vehicles(year);
CREATE INDEX idx_vehicles_engine_code ON vehicles(engine_code);
CREATE INDEX idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX idx_vehicles_make_model_year ON vehicles(make, model, year);

COMMENT ON TABLE vehicles IS 'Master table of all vehicle makes, models, and specifications';

-- ============================================================================
-- USER VEHICLES (User's Garage)
-- ============================================================================

CREATE TABLE user_vehicles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    nickname        VARCHAR(100),           -- e.g., "My Daily Driver"
    vin             VARCHAR(17),            -- Vehicle Identification Number
    license_plate   VARCHAR(20),
    mileage         INTEGER,
    is_primary      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_vehicle UNIQUE (user_id, vehicle_id)
);

-- Indexes for user_vehicles
CREATE INDEX idx_user_vehicles_user_id ON user_vehicles(user_id);
CREATE INDEX idx_user_vehicles_vehicle_id ON user_vehicles(vehicle_id);

COMMENT ON TABLE user_vehicles IS 'Links users to their registered vehicles (user garage)';

-- ============================================================================
-- CATEGORIES TABLE (Nested/Hierarchical)
-- ============================================================================

CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(120) NOT NULL UNIQUE,
    parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
    description     TEXT,
    image_url       VARCHAR(500),
    display_order   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    level           INTEGER DEFAULT 0,      -- Depth level for easier querying
    path            TEXT,                   -- Materialized path: '/brakes/pads/'
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for categories
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_level ON categories(level);
CREATE INDEX idx_categories_path ON categories USING gin(path gin_trgm_ops);
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- Enable trigram extension for path searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMENT ON TABLE categories IS 'Hierarchical product categories (e.g., Brakes > Pads > Ceramic Pads)';

-- ============================================================================
-- BRANDS TABLE
-- ============================================================================

CREATE TABLE brands (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(120) NOT NULL UNIQUE,
    logo_url        VARCHAR(500),
    description     TEXT,
    country         VARCHAR(100),
    website         VARCHAR(255),
    is_active       BOOLEAN DEFAULT TRUE,
    is_premium      BOOLEAN DEFAULT FALSE,  -- Premium/OEM brand flag
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for brands
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_is_active ON brands(is_active);

COMMENT ON TABLE brands IS 'Auto parts manufacturers and brands (Bosch, Brembo, etc.)';

-- ============================================================================
-- PARTS TABLE
-- ============================================================================

CREATE TABLE parts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku             VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    price           DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    sale_price      DECIMAL(10,2) CHECK (sale_price >= 0),
    cost_price      DECIMAL(10,2) CHECK (cost_price >= 0),
    stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_level INTEGER DEFAULT 5,      -- For stock alerts
    brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    image_url       VARCHAR(500),
    weight          DECIMAL(8,3),           -- Weight in kg for shipping
    dimensions      JSONB,                  -- {"length": 10, "width": 5, "height": 3}
    oem_numbers     TEXT[],                 -- Original Equipment Manufacturer part numbers
    specifications  JSONB,                  -- Flexible specs storage
    is_active       BOOLEAN DEFAULT TRUE,
    is_featured     BOOLEAN DEFAULT FALSE,
    warranty_months INTEGER DEFAULT 24,
    views_count     INTEGER DEFAULT 0,
    sales_count     INTEGER DEFAULT 0,
    avg_rating      DECIMAL(2,1) DEFAULT 0,
    rating_count    INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for parts
CREATE INDEX idx_parts_sku ON parts(sku);
CREATE INDEX idx_parts_name ON parts USING gin(name gin_trgm_ops);
CREATE INDEX idx_parts_brand_id ON parts(brand_id);
CREATE INDEX idx_parts_category_id ON parts(category_id);
CREATE INDEX idx_parts_price ON parts(price);
CREATE INDEX idx_parts_stock_quantity ON parts(stock_quantity);
CREATE INDEX idx_parts_is_active ON parts(is_active);
CREATE INDEX idx_parts_is_featured ON parts(is_featured);
CREATE INDEX idx_parts_oem_numbers ON parts USING gin(oem_numbers);
CREATE INDEX idx_parts_sales_count ON parts(sales_count DESC);
CREATE INDEX idx_parts_avg_rating ON parts(avg_rating DESC);

-- Full-text search index
CREATE INDEX idx_parts_search ON parts USING gin(
    to_tsvector('french', coalesce(name, '') || ' ' || coalesce(description, ''))
);

COMMENT ON TABLE parts IS 'Main product catalog for auto parts';

-- ============================================================================
-- PART IMAGES TABLE (Multiple images per part)
-- ============================================================================

CREATE TABLE part_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id         UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    image_url       VARCHAR(500) NOT NULL,
    alt_text        VARCHAR(255),
    display_order   INTEGER DEFAULT 0,
    is_primary      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for part_images
CREATE INDEX idx_part_images_part_id ON part_images(part_id);

COMMENT ON TABLE part_images IS 'Gallery images for parts (multiple images per part)';

-- ============================================================================
-- PART COMPATIBILITY TABLE (CRITICAL - Junction Table)
-- ============================================================================

CREATE TABLE part_compatibility (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id         UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    notes           TEXT,                   -- Fitment notes or special instructions
    position        VARCHAR(50),            -- 'front', 'rear', 'left', 'right', etc.
    is_verified     BOOLEAN DEFAULT FALSE,  -- Verified compatibility
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no duplicate part-vehicle combinations
    CONSTRAINT unique_part_vehicle UNIQUE (part_id, vehicle_id, position)
);

-- Critical indexes for part compatibility lookups
CREATE INDEX idx_part_compatibility_part_id ON part_compatibility(part_id);
CREATE INDEX idx_part_compatibility_vehicle_id ON part_compatibility(vehicle_id);
CREATE INDEX idx_part_compatibility_part_vehicle ON part_compatibility(part_id, vehicle_id);

-- Covering index for common compatibility queries
CREATE INDEX idx_part_compatibility_lookup ON part_compatibility(vehicle_id, part_id) 
    INCLUDE (position, notes);

COMMENT ON TABLE part_compatibility IS 'CRITICAL: Links parts to compatible vehicles for fitment verification';

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================

CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number        VARCHAR(20) NOT NULL UNIQUE,
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    status              order_status NOT NULL DEFAULT 'pending',
    payment_status      payment_status DEFAULT 'pending',
    
    -- Price breakdown
    subtotal            DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    discount_amount     DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    shipping_cost       DECIMAL(10,2) DEFAULT 0 CHECK (shipping_cost >= 0),
    tax_amount          DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount        DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    
    -- Currency
    currency            VARCHAR(3) DEFAULT 'EUR',
    
    -- Shipping details (denormalized for order history)
    shipping_first_name VARCHAR(100),
    shipping_last_name  VARCHAR(100),
    shipping_address    VARCHAR(255),
    shipping_address2   VARCHAR(255),
    shipping_city       VARCHAR(100),
    shipping_state      VARCHAR(100),
    shipping_postal     VARCHAR(20),
    shipping_country    VARCHAR(100),
    shipping_phone      VARCHAR(20),
    
    -- Billing details
    billing_first_name  VARCHAR(100),
    billing_last_name   VARCHAR(100),
    billing_address     VARCHAR(255),
    billing_city        VARCHAR(100),
    billing_postal      VARCHAR(20),
    billing_country     VARCHAR(100),
    
    -- Tracking
    shipping_method     VARCHAR(100),
    tracking_number     VARCHAR(100),
    carrier             VARCHAR(50),
    
    -- Notes and metadata
    customer_notes      TEXT,
    admin_notes         TEXT,
    ip_address          INET,
    user_agent          TEXT,
    
    -- Timestamps
    ordered_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at        TIMESTAMP WITH TIME ZONE,
    shipped_at          TIMESTAMP WITH TIME ZONE,
    delivered_at        TIMESTAMP WITH TIME ZONE,
    cancelled_at        TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for orders
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_ordered_at ON orders(ordered_at DESC);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

COMMENT ON TABLE orders IS 'Customer orders with full address and payment details';

-- ============================================================================
-- ORDER ITEMS TABLE
-- ============================================================================

CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    part_id         UUID REFERENCES parts(id) ON DELETE SET NULL,
    vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    
    -- Denormalized product info (preserved for order history)
    sku             VARCHAR(50) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    brand_name      VARCHAR(100),
    
    -- Pricing
    unit_price      DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    discount        DECIMAL(10,2) DEFAULT 0,
    line_total      DECIMAL(10,2) NOT NULL CHECK (line_total >= 0),
    
    -- Vehicle info for this purchase
    vehicle_info    VARCHAR(255),           -- "Renault Clio 2020 1.5 K9K"
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for order_items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_part_id ON order_items(part_id);
CREATE INDEX idx_order_items_vehicle_id ON order_items(vehicle_id);

COMMENT ON TABLE order_items IS 'Individual line items within each order';

-- ============================================================================
-- SHOPPING CART TABLE
-- ============================================================================

CREATE TABLE cart_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id      VARCHAR(100),           -- For guest carts
    part_id         UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Either user_id or session_id must be present
    CONSTRAINT cart_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Indexes for cart_items
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_session_id ON cart_items(session_id);
CREATE INDEX idx_cart_items_part_id ON cart_items(part_id);

COMMENT ON TABLE cart_items IS 'Shopping cart for logged-in users and guests';

-- ============================================================================
-- PRODUCT REVIEWS TABLE
-- ============================================================================

CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id         UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
    vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title           VARCHAR(200),
    comment         TEXT,
    pros            TEXT,
    cons            TEXT,
    is_verified     BOOLEAN DEFAULT FALSE,  -- Verified purchase
    is_approved     BOOLEAN DEFAULT FALSE,  -- Admin approved
    helpful_count   INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- One review per user per part
    CONSTRAINT unique_user_part_review UNIQUE (user_id, part_id)
);

-- Indexes for reviews
CREATE INDEX idx_reviews_part_id ON reviews(part_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

COMMENT ON TABLE reviews IS 'Customer reviews and ratings for parts';

-- ============================================================================
-- WISHLISTS TABLE
-- ============================================================================

CREATE TABLE wishlists (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    part_id         UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    notify_on_sale  BOOLEAN DEFAULT TRUE,
    notify_in_stock BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_wishlist_part UNIQUE (user_id, part_id)
);

-- Indexes for wishlists
CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_part_id ON wishlists(part_id);

COMMENT ON TABLE wishlists IS 'User wishlist for saving parts for later';

-- ============================================================================
-- COUPONS TABLE
-- ============================================================================

CREATE TABLE coupons (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(50) NOT NULL UNIQUE,
    description         TEXT,
    discount_type       VARCHAR(20) NOT NULL,  -- 'percentage', 'fixed'
    discount_value      DECIMAL(10,2) NOT NULL,
    min_order_amount    DECIMAL(10,2) DEFAULT 0,
    max_discount        DECIMAL(10,2),          -- Cap for percentage discounts
    usage_limit         INTEGER,                -- Total usage limit
    usage_count         INTEGER DEFAULT 0,
    per_user_limit      INTEGER DEFAULT 1,
    valid_from          TIMESTAMP WITH TIME ZONE,
    valid_until         TIMESTAMP WITH TIME ZONE,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for coupons
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_coupons_valid_dates ON coupons(valid_from, valid_until);

COMMENT ON TABLE coupons IS 'Discount coupons and promotional codes';

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON user_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View for parts with low stock
CREATE VIEW v_low_stock_parts AS
SELECT 
    p.id,
    p.sku,
    p.name,
    b.name AS brand_name,
    p.stock_quantity,
    p.min_stock_level,
    (p.min_stock_level - p.stock_quantity) AS units_needed
FROM parts p
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.stock_quantity <= p.min_stock_level
  AND p.is_active = TRUE
ORDER BY units_needed DESC;

-- View for parts compatible with a vehicle (for API use)
CREATE VIEW v_part_compatibility AS
SELECT 
    pc.id,
    pc.part_id,
    p.sku,
    p.name AS part_name,
    p.price,
    p.stock_quantity,
    b.name AS brand_name,
    c.name AS category_name,
    pc.vehicle_id,
    v.make,
    v.model,
    v.year,
    v.engine_code,
    pc.position,
    pc.notes,
    pc.is_verified
FROM part_compatibility pc
JOIN parts p ON pc.part_id = p.id
JOIN vehicles v ON pc.vehicle_id = v.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = TRUE;

-- View for order summary
CREATE VIEW v_order_summary AS
SELECT 
    o.id,
    o.order_number,
    o.user_id,
    u.email AS user_email,
    o.status,
    o.payment_status,
    o.total_amount,
    o.ordered_at,
    COUNT(oi.id) AS item_count,
    SUM(oi.quantity) AS total_items
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, u.email;

-- ============================================================================
-- SAMPLE DATA INSERTION (Optional - for testing)
-- ============================================================================

-- Uncomment below to insert sample data

/*
-- Sample brands
INSERT INTO brands (name, slug, country, is_premium) VALUES
('Bosch', 'bosch', 'Germany', true),
('Brembo', 'brembo', 'Italy', true),
('Valeo', 'valeo', 'France', false),
('TRW', 'trw', 'Germany', false),
('Febi Bilstein', 'febi-bilstein', 'Germany', false);

-- Sample categories
INSERT INTO categories (name, slug, level, path) VALUES
('Brakes', 'brakes', 0, '/brakes/'),
('Engine', 'engine', 0, '/engine/'),
('Suspension', 'suspension', 0, '/suspension/');

INSERT INTO categories (name, slug, parent_id, level, path) VALUES
('Brake Pads', 'brake-pads', (SELECT id FROM categories WHERE slug = 'brakes'), 1, '/brakes/brake-pads/'),
('Brake Discs', 'brake-discs', (SELECT id FROM categories WHERE slug = 'brakes'), 1, '/brakes/brake-discs/'),
('Oil Filters', 'oil-filters', (SELECT id FROM categories WHERE slug = 'engine'), 1, '/engine/oil-filters/'),
('Shock Absorbers', 'shock-absorbers', (SELECT id FROM categories WHERE slug = 'suspension'), 1, '/suspension/shock-absorbers/');

-- Sample vehicles
INSERT INTO vehicles (make, model, year, engine_code, engine_size, fuel_type) VALUES
('Renault', 'Clio', 2020, 'K9K', 1.5, 'diesel'),
('Renault', 'Clio', 2020, 'H5F', 1.2, 'petrol'),
('Peugeot', '308', 2019, 'DV6C', 1.6, 'diesel'),
('Peugeot', '308', 2019, 'EP6', 1.6, 'petrol'),
('BMW', '320d', 2021, 'N47D20', 2.0, 'diesel'),
('Volkswagen', 'Golf', 2020, 'DFGA', 2.0, 'diesel');

-- Sample admin user (password: Admin123!)
INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES
('admin@autoparts.com', '$2b$12$hashed_password_here', 'admin', 'Admin', 'User');
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
