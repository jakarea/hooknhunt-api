#!/bin/bash
#
# Simple Queue Worker Script for cPanel Cron
#
# Usage: bash queue-worker.sh
# Or add to cPanel cron:
# */5 * * * * /home/yourusername/public_html/queue-worker.sh
#

# Set path to PHP and project
PHP_BIN="/usr/local/bin/php"
PROJECT_DIR="/home/alugxzaz/probesh.hooknhunt.com"
MAX_JOBS=10
MAX_TIME=55

echo "=========================================="
echo " Queue Worker for cPanel"
echo "=========================================="
echo "Max jobs: $MAX_JOBS"
echo "Max time: $MAX_TIME seconds"
echo ""

cd "$PROJECT_DIR" || exit 1

START_TIME=$(date +%s)
JOBS_PROCESSED=0
JOBS_FAILED=0

while [ $JOBS_PROCESSED -lt $MAX_JOBS ]; do
    # Check time limit
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))

    if [ $ELAPSED -ge $MAX_TIME ]; then
        echo ""
        echo "⏰ Time limit reached ($MAX_TIME seconds)"
        break
    fi

    # Process ONE job
    OUTPUT=$($PHP_BIN artisan queue:work --once --no-interaction 2>&1)
    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
        JOBS_PROCESSED=$((JOBS_PROCESSED + 1))
        echo "✓ Job #$JOBS_PROCESSED processed"
    else
        JOBS_FAILED=$((JOBS_FAILED + 1))
        echo "✗ Job failed (exit code: $EXIT_CODE)"
    fi

    # Small delay
    sleep 0.1
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "=========================================="
echo " Summary:"
echo "=========================================="
echo "✓ Processed: $JOBS_PROCESSED jobs"
echo "✗ Failed: $JOBS_FAILED jobs"
echo "⏱ Duration: ${DURATION}s"
echo "=========================================="

exit 0
