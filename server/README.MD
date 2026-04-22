2. The Solution: Essential Indexes
   To make this run in milliseconds, you must have these three indexes. Without them, the WHERE clauses and ORDER BY will be very slow.

Listings Index: CREATE INDEX idx_listings_id ON listings(id) WHERE deleted_at IS NULL;

Rooms Index (The most important one): This index covers the filtering (listing_id, room_type) and the sorting (avg_rating, price_per_month) all in one go.

SQL

CREATE INDEX idx_rooms_listing_type_sort
ON rooms (listing_id, r_type, avg_rating DESC, price_per_month ASC);
Photos Index: CREATE INDEX idx_rooms_photos_room_id ON rooms_photos(room_id);

avatar url ; <img
src={user.avatar || "https://ui-avatars.com/api/?name=Arjun+Sharma&background=6366f1&color=fff"}
alt="Profile"
className="w-16 h-16 rounded-full object-cover"
/>
