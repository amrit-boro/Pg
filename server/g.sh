#!/bin/bash

# Configuration
DB_NAME="home_project"
DB_USER="postgres"

# Your Specific Parameters
MAX_PRICE=9000
CITY_NAME="Bangalore"

echo "Starting 10,000 lookups for $CITY_NAME with max price $MAX_PRICE..."

# Start a timer
START_TIME=$(date +%s%3N)

{
  echo "\\timing on"  # Enable Postgres internal timing
  for i in {1..10000}
  do
    # The formatted query with your specific values
    echo "SELECT l.*, loc.city \
          FROM listings l \
          JOIN locations loc ON l.location_id = loc.id \
          WHERE l.status = 'active' \
          AND l.deleted_at IS NULL \
          AND l.price_per_month <= $MAX_PRICE \
          AND loc.city = '$CITY_NAME' \
          ORDER BY l.created_at DESC;"
  done
} | psql -h localhost -d $DB_NAME -U $DB_USER -o /dev/null

END_TIME=$(date +%s%3N)
DURATION=$((END_TIME - START_TIME))

echo "-------------------------------------"
echo "Results for: $CITY_NAME (Max: $MAX_PRICE)"
echo "Total Script Duration: $DURATION ms"
echo "Average per request: $((DURATION / 10000)) ms"
echo "-------------------------------------"