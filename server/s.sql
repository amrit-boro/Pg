-- ============================================================
-- ROOM FINDING DATABASE SCHEMA
-- Designer: Senior PostgreSQL Architect
-- Version:  1.0
-- Engine:   PostgreSQL 15+ (with PostGIS extension)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy text search


-- ============================================================
-- ENUMERATIONS
-- ============================================================

CREATE TYPE user_role         AS ENUM ('guest', 'host', 'admin');
CREATE TYPE gender            AS ENUM ('male', 'female', 'non_binary', 'prefer_not_to_say');
CREATE TYPE listing_type      AS ENUM ('girls_pg', 'boys_pg', 'entire_unit', 'studio', 'rent');
CREATE TYPE listing_status    AS ENUM ('draft', 'active', 'paused', 'deactivated');
CREATE TYPE booking_status    AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'rejected');
CREATE TYPE cancellation_by   AS ENUM ('guest', 'host', 'system');
CREATE TYPE payment_status    AS ENUM ('pending', 'paid', 'refunded', 'failed');
CREATE TYPE payment_method    AS ENUM ('credit_card', 'debit_card', 'bank_transfer', 'wallet', 'cash');
CREATE TYPE report_reason     AS ENUM ('spam', 'inappropriate', 'fraud', 'safety', 'other');
CREATE TYPE report_status     AS ENUM ('open', 'under_review', 'resolved', 'dismissed');
CREATE TYPE notification_type AS ENUM ('booking_request', 'booking_confirmed', 'booking_cancelled',
                                        'new_message', 'new_review', 'payment', 'system');
CREATE TYPE room_type         AS ENUM ('single','double','tripple','shared');
CREATE TYPE room_status       AS ENUM ('available','fully_occupied','maintenance','inactive')

-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE users (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255)    NOT NULL UNIQUE,
    phone               VARCHAR(30)     UNIQUE,
    password_hash       TEXT            NOT NULL,
    role                user_role       NOT NULL DEFAULT 'guest',
    first_name          VARCHAR(100)    NOT NULL,
    last_name           VARCHAR(100)    NOT NULL,
    date_of_birth       DATE,
    gender              gender,         NOT NULL
    avatar_url          TEXT,
    bio                 TEXT,
    is_email_verified   BOOLEAN         NOT NULL DEFAULT FALSE,
    is_phone_verified   BOOLEAN         NOT NULL DEFAULT FALSE,
    is_id_verified      BOOLEAN         NOT NULL DEFAULT FALSE,  -- govt ID check
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    preferred_language  CHAR(5)         DEFAULT 'en',            -- BCP-47
    preferred_currency  CHAR(3)         DEFAULT 'USD',           -- ISO 4217
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ                              -- soft delete
);


CREATE INDEX idx_users_email         ON users (email);
CREATE INDEX idx_users_role          ON users (role);
CREATE INDEX idx_users_active        ON users (is_active) WHERE deleted_at IS NULL;


-- ============================================================
-- 2. USER IDENTITY VERIFICATION
-- ============================================================

CREATE TABLE user_verifications (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type   VARCHAR(50) NOT NULL,   -- passport, national_id, driver_license
    document_url    TEXT        NOT NULL,   -- encrypted S3 path
    verified_at     TIMESTAMPTZ,
    verified_by     UUID        REFERENCES users(id),
    rejection_note  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 3. LOCATIONS (reusable across listings)
-- ============================================================

CREATE TABLE locations (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_line1   VARCHAR(255)    NOT NULL,
    address_line2   VARCHAR(255),
    city            VARCHAR(100)    NOT NULL,
    state           VARCHAR(100),
    postal_code     VARCHAR(20),
    country_code    CHAR(2)         NOT NULL,   -- ISO 3166-1 alpha-2
    latitude        NUMERIC(9,6)    NOT NULL,
    longitude       NUMERIC(9,6)    NOT NULL,
    geog            GEOGRAPHY(POINT, 4326),     -- PostGIS point for spatial queries
    neighbourhood   VARCHAR(100),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);



CREATE INDEX idx_locations_geog ON locations USING GIST (geog);
CREATE INDEX idx_locations_city ON locations (city);

-- Auto-populate the geog column from lat/lon
CREATE OR REPLACE FUNCTION sync_location_geog()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.geog := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_location_geog
BEFORE INSERT OR UPDATE OF latitude, longitude ON locations
FOR EACH ROW EXECUTE FUNCTION sync_location_geog();


-- ============================================================
-- 4. AMENITIES (master catalogue)
-- ============================================================

CREATE TABLE amenities (
    id          SERIAL          PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL UNIQUE,
    category    VARCHAR(50)     NOT NULL,   -- bathroom, kitchen, safety, internet, etc.
    icon_key    VARCHAR(50),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 5. LISTINGS
-- ============================================================

CREATE TABLE listings (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CAS,
    location_id         UUID            NOT NULL REFERENCES locations(id),
    title               VARCHAR(200)    NOT NULL, ////// issue
    description         TEXT,
    listing_type        listing_type    NOT NULL,
    status              listing_status  NOT NULL DEFAULT 'draft',

    -- Room specs
    total_rooms         SMALLINT        NOT NULL DEFAULT 1 CHECK (total_rooms > 0),
    available_rooms     SMALLINT        NOT NULL DEFAULT 1 CHECK (available_rooms >= 0),
    max_occupants       SMALLINT        NOT NULL DEFAULT 1 CHECK (max_occupants > 0),
    floor_area_sqm      NUMERIC(7,2),
    floor_number        SMALLINT,
    total_floors        SMALLINT,
    is_furnished        BOOLEAN         NOT NULL DEFAULT FALSE,
    allows_pets         BOOLEAN         NOT NULL DEFAULT FALSE,
    allows_smoking      BOOLEAN         NOT NULL DEFAULT FALSE,
    gender_preference   gender,                              -- NULL = no preference

    -- Pricing
    starting_price     NUMERIC(10,2)   NOT NULL CHECK (starting_price > 0),
    price_per_week      NUMERIC(10,2),
    price_per_day       NUMERIC(10,2),
    currency            CHAR(3)         NOT NULL DEFAULT 'USD',
    security_deposit    NUMERIC(10,2)   DEFAULT 0,
    utilities_included  BOOLEAN         NOT NULL DEFAULT FALSE,
    utility_details     JSONB,          -- {"water": true, "electricity": false, "wifi": true}

    -- Availability
    available_from      DATE            NOT NULL,
    available_to        DATE,           -- NULL = indefinitely
    min_stay_days       SMALLINT        NOT NULL DEFAULT 30,
    max_stay_days       SMALLINT,

    -- Rules & extra info (flexible)
    house_rules         TEXT,
    extra_info          JSONB,          -- arbitrary host-defined metadata

    -- Aggregates (denormalized for performance)
    avg_rating          NUMERIC(3,2)    DEFAULT 0,
    review_count        INTEGER         DEFAULT 0,
    view_count          INTEGER         DEFAULT 0,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_listings_host          ON listings (host_id);
CREATE INDEX idx_listings_status        ON listings (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_available     ON listings (available_from, available_to) WHERE status = 'active';
CREATE INDEX idx_listings_price         ON listings (price_per_month) WHERE status = 'active';
CREATE INDEX idx_listings_type          ON listings (listing_type); ✅Done
CREATE INDEX idx_listings_title_trgm    ON listings USING GIN (title gin_trgm_ops);


-- ============================================================
-- 6. LISTING ↔ AMENITY (many-to-many)
-- ============================================================

-- =============================================================
-- ROOM SPECIFIC----------------- NEW🌟
CREATE TABLE rooms (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    listing_id         UUID NOT NULL
                       REFERENCES listings(id)
                       ON DELETE CASCADE,

    -- Identification
    room_number        VARCHAR(20) NOT NULL,
    room_type          room_type NOT NULL,  -- single | double | triple | dorm
    title              VARCHAR(150),
    description        TEXT,

    -- Capacity
    capacity           SMALLINT NOT NULL CHECK (capacity > 0),
    available_beds     SMALLINT NOT NULL CHECK (available_beds >= 0),

    -- Pricing (Room-level pricing)
    price_per_month    NUMERIC(10,2) NOT NULL CHECK (price_per_month > 0),
    price_per_week     NUMERIC(10,2),
    price_per_day      NUMERIC(10,2),
    security_deposit   NUMERIC(10,2) DEFAULT 0,
    currency           CHAR(3) NOT NULL DEFAULT 'USD',

    -- Room Attributes
    floor_number       SMALLINT,
    floor_area_sqm     NUMERIC(7,2),
    is_furnished       BOOLEAN NOT NULL DEFAULT FALSE,
    utility_details    JSONB,

    -- Availability
    status             room_status NOT NULL DEFAULT 'available',
    available_from     DATE,
    available_to       DATE,

    -- Rules (Room-specific override)
    extra_info         VARCHAR(250),

    -- Aggregates
    avg_rating         NUMERIC(3,2) DEFAULT 0,
    review_count       INTEGER DEFAULT 0,
    view_count         INTEGER DEFAULT 0,

    -- Soft delete & timestamps
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at         TIMESTAMPTZ,

    -- Constraints
    UNIQUE (listing_id, room_number)
);
--- ===========================================================================================================================================

CREATE TABLE listing_amenities (
    listing_id  UUID    NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    amenity_id  INTEGER NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (listing_id, amenity_id)
);


-- ============================================================
-- 7. LISTING PHOTOS
-- ============================================================

CREATE TABLE listing_photos (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id  UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    url         TEXT        NOT NULL,
    caption     VARCHAR(200),
    is_cover    BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order  SMALLINT    NOT NULL DEFAULT 0,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- new shcema-----
CREATE TABLE listing_photos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    public_id   TEXT NOT NULL,
    caption     VARCHAR(200),
    is_cover    BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photos_listing ON listing_photos (listing_id, sort_order);

-- Enforce only one cover photo per listing
CREATE UNIQUE INDEX idx_photos_one_cover ON listing_photos (listing_id)
    WHERE is_cover = TRUE;


--- ROOM PHOTOS--------------------------------------------------🌟

CREATE TABLE rooms_photos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    room_id  UUID NOT NULL
                REFERENCES rooms(id)
                ON DELETE CASCADE,

    url         TEXT NOT NULL,
    public_id   TEXT NOT NULL,
    caption     VARCHAR(200),
    is_cover    BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  SMALLINT NOT NULL DEFAULT 0,

    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. SAVED / FAVOURITES
-- ============================================================

CREATE TABLE saved_listings (
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id  UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    saved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, listing_id)
);


-- ============================================================
-- 9. BOOKING REQUESTS
-- ============================================================

CREATE TABLE bookings (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id          UUID            NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
    guest_id            UUID            NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    host_id             UUID            NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status              booking_status  NOT NULL DEFAULT 'pending',

    -- Stay period
    check_in_date       DATE            NOT NULL,
    check_out_date      DATE            NOT NULL,
    num_occupants       SMALLINT        NOT NULL DEFAULT 1,

    -- Financials (snapshot at booking time)
    price_per_month     NUMERIC(10,2)   NOT NULL,
    total_amount        NUMERIC(10,2)   NOT NULL,
    security_deposit    NUMERIC(10,2)   NOT NULL DEFAULT 0,
    currency            CHAR(3)         NOT NULL DEFAULT 'USD',

    -- Guest message at booking
    guest_message       TEXT,
    host_response       TEXT,

    -- Cancellation
    cancelled_at        TIMESTAMPTZ,
    cancelled_by        cancellation_by,
    cancellation_reason TEXT,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT chk_occupants CHECK (num_occupants > 0)
);

CREATE INDEX idx_bookings_listing  ON bookings (listing_id);
CREATE INDEX idx_bookings_guest    ON bookings (guest_id);
CREATE INDEX idx_bookings_host     ON bookings (host_id);
CREATE INDEX idx_bookings_status   ON bookings (status);
CREATE INDEX idx_bookings_dates    ON bookings (check_in_date, check_out_date);


-- ============================================================
-- 10. PAYMENTS
-- ============================================================

CREATE TABLE payments (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id          UUID            NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    payer_id            UUID            NOT NULL REFERENCES users(id),
    payee_id            UUID            NOT NULL REFERENCES users(id),
    amount              NUMERIC(10,2)   NOT NULL CHECK (amount > 0),
    currency            CHAR(3)         NOT NULL DEFAULT 'USD',
    status              payment_status  NOT NULL DEFAULT 'pending',
    payment_method      payment_method  NOT NULL,
    gateway_reference   VARCHAR(255),   -- external payment gateway txn ID
    gateway_response    JSONB,          -- raw gateway payload
    paid_at             TIMESTAMPTZ,
    refunded_at         TIMESTAMPTZ,
    refund_amount       NUMERIC(10,2),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments (booking_id);
CREATE INDEX idx_payments_status  ON payments (status);


-- ============================================================
-- 11. REVIEWS
-- ============================================================

CREATE TABLE reviews (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID        NOT NULL UNIQUE REFERENCES bookings(id),
    reviewer_id     UUID        NOT NULL REFERENCES users(id),
    reviewee_id     UUID        NOT NULL REFERENCES users(id),
    listing_id      UUID        REFERENCES listings(id),   -- NULL for host/guest reviews
    overall_rating  SMALLINT    NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    cleanliness     SMALLINT    CHECK (cleanliness BETWEEN 1 AND 5),
    accuracy        SMALLINT    CHECK (accuracy BETWEEN 1 AND 5),
    communication   SMALLINT    CHECK (communication BETWEEN 1 AND 5),
    location_score  SMALLINT    CHECK (location_score BETWEEN 1 AND 5),
    value           SMALLINT    CHECK (value BETWEEN 1 AND 5),
    comment         TEXT,
    is_public       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-----------------------------------------------------Cir

CREATE TABLE reviews (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id      UUID        REFERENCES listings(id) ON DELETE CASCADE,   -- NULL for host/guest reviews
    overall_rating  SMALLINT    NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_listing   ON reviews (listing_id);
CREATE INDEX idx_reviews_reviewer  ON reviews (reviewer_id);
CREATE INDEX idx_reviews_reviewee  ON reviews (reviewee_id);

-- Recalculate listing aggregate rating after insert/update/delete
CREATE OR REPLACE FUNCTION refresh_listing_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE listings
    SET
        avg_rating   = sub.avg_r,
        review_count = sub.cnt,
        updated_at   = NOW()
    FROM (
        SELECT
            AVG(overall_rating)::NUMERIC(3,2) AS avg_r,
            COUNT(*) AS cnt
        FROM reviews
        WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id)
          AND is_public = TRUE
    ) sub
    WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_refresh_listing_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION refresh_listing_rating();


-- ============================================================
-- 12. MESSAGING
-- ============================================================

CREATE TABLE conversations (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id  UUID        REFERENCES listings(id),
    booking_id  UUID        REFERENCES bookings(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_participants (
    conversation_id UUID    NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body            TEXT        NOT NULL,
    attachment_url  TEXT,
    is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_unread       ON messages (sender_id) WHERE is_read = FALSE;


-- ============================================================
-- 13. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id          UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        notification_type   NOT NULL,
    title       VARCHAR(200)        NOT NULL,
    body        TEXT,
    meta        JSONB,              -- {"booking_id": "...", "listing_id": "..."}
    is_read     BOOLEAN             NOT NULL DEFAULT FALSE,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE is_read = FALSE;


-- ============================================================
-- 14. REPORTS / MODERATION
-- ============================================================

CREATE TABLE reports (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id     UUID            NOT NULL REFERENCES users(id),
    reported_user   UUID            REFERENCES users(id),
    reported_listing UUID           REFERENCES listings(id),
    reason          report_reason   NOT NULL,
    details         TEXT,
    status          report_status   NOT NULL DEFAULT 'open',
    resolved_by     UUID            REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_report_target CHECK (
        reported_user IS NOT NULL OR reported_listing IS NOT NULL
    )
);

CREATE INDEX idx_reports_status ON reports (status);


-- ============================================================
-- 15. SEARCH HISTORY (optional, for recommendations)
-- ============================================================

CREATE TABLE search_history (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
    session_id      VARCHAR(64),                -- for anonymous users
    query_text      VARCHAR(255),
    filters         JSONB,      -- {"city":"Bangkok","max_price":500,"type":"private_room"}
    result_count    INTEGER,
    searched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_history_user ON search_history (user_id, searched_at DESC);


-- ============================================================
-- UTILITY: updated_at auto-refresh
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- SEED: Base amenities
-- ============================================================

INSERT INTO amenities (name, category, icon_key) VALUES
    ('WiFi',                'internet',   'wifi'),
    ('Air Conditioning',    'climate',    'ac'),
    ('Heating',             'climate',    'heat'),
    ('Private Bathroom',    'bathroom',   'bath_private'),
    ('Shared Bathroom',     'bathroom',   'bath_shared'),
    ('Kitchen Access',      'kitchen',    'kitchen'),
    ('Washing Machine',     'laundry',    'washer'),
    ('Dryer',               'laundry',    'dryer'),
    ('Parking',             'transport',  'parking'),
    ('Gym',                 'fitness',    'gym'),
    ('Swimming Pool',       'fitness',    'pool'),
    ('Security CCTV',       'safety',     'cctv'),
    ('Smoke Detector',      'safety',     'smoke_det'),
    ('Fire Extinguisher',   'safety',     'fire_ext'),
    ('Elevator',            'building',   'elevator'),
    ('Balcony',             'outdoor',    'balcony'),
    ('Garden',              'outdoor',    'garden'),
    ('Study Desk',          'furniture',  'desk'),
    ('Wardrobe',            'furniture',  'wardrobe'),
    ('Refrigerator',        'kitchen',    'fridge');