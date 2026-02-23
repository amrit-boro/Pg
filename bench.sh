#!/bin/bash

URL="http://localhost:8000/api/v1/pg/getAllPgRoom"
TOTAL_REQUESTS=10000
CONCURRENCY=100

echo "🚀 Starting benchmark: $TOTAL_REQUESTS requests to $URL"
echo "Parallel workers: $CONCURRENCY"

# Capture start time in seconds
START_TIME=$(date +%s)

# Use seq to generate numbers, and xargs to run curl in parallel
seq $TOTAL_REQUESTS | xargs -I % -P $CONCURRENCY curl -s -o /dev/null "$URL"

# Capture end time
END_TIME=$(date +%s)

# Calculate duration
DURATION=$((END_TIME - START_TIME))

echo "--------------------------------------"
echo "✅ Benchmark Complete!"
echo "Total Time: $DURATION seconds"
echo "Average Throughput: $((TOTAL_REQUESTS / DURATION)) requests/sec"
echo "--------------------------------------"