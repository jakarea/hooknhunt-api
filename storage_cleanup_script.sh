#!/bin/bash

# DATABASE STORAGE CLEANUP SCRIPT
# Run this script to safely remove unused storage files identified by database analysis
# Always backup before running!

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPORT_FILE="storage/app/unused_storage_report.json"
BACKUP_DIR="./storage_cleanup_backup_$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}STORAGE CLEANUP SCRIPT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if report exists
if [ ! -f "$REPORT_FILE" ]; then
    echo -e "${RED}Error: Report file not found: $REPORT_FILE${NC}"
    echo "Run 'php artisan storage:analyze-unused' first to generate the report."
    exit 1
fi

# Parse report data
TOTAL_FILES=$(jq -r '.summary.total_media_files' "$REPORT_FILE")
UNUSED_FILES=$(jq -r '.summary.unused_files' "$REPORT_FILE")
TOTAL_STORAGE=$(jq -r '.summary.total_storage' "$REPORT_FILE")
UNUSED_STORAGE=$(jq -r '.summary.unused_storage' "$REPORT_FILE")

echo "📊 STORAGE ANALYSIS RESULTS:"
echo "   Total media files: $TOTAL_FILES"
echo "   Unused files: $UNUSED_FILES"
echo "   Total storage: $TOTAL_STORAGE"
echo "   Unused storage: $UNUSED_STORAGE"
echo ""

# Function to ask for confirmation
confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# Phase 1: Preview what will be deleted
echo -e "${YELLOW}PHASE 1: PREVIEW DELETIONS${NC}"
echo "The following files will be deleted:"
echo ""

# Extract first 10 files for preview
jq -r '.unused_files | to_entries | .[0:10] | .[] | "  - \(.value.file_name) (\(.value.file_size)) - ID: \(.value.id)"' "$REPORT_FILE"

if [ "$UNUSED_FILES" -gt 10 ]; then
    echo "  ... and $((UNUSED_FILES - 10)) more files"
fi

echo ""
echo -e "${RED}Total files to delete: $UNUSED_FILES${NC}"
echo -e "${RED}Total space to reclaim: $UNUSED_STORAGE${NC}"
echo ""

# Phase 2: Create backup
echo -e "${YELLOW}PHASE 2: CREATE BACKUP${NC}"
echo "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

echo "Backing up files to be deleted..."
jq -r '.unused_files | .[] | .full_path' "$REPORT_FILE" | while read -r filepath; do
    if [ -f "$filepath" ]; then
        # Create directory structure in backup
        backup_path="$BACKUP_DIR/$(dirname "$filepath" | sed 's|/Users/jakareaparvez/Sites/hooknhunt-api/||')"
        mkdir -p "$backup_path"
        
        # Copy file to backup
        cp "$filepath" "$backup_path/"
        echo "  Backed up: $(basename "$filepath")"
    fi
done

echo -e "${GREEN}✓ Backup created in: $BACKUP_DIR${NC}"
echo ""

# Phase 3: Delete files
echo -e "${YELLOW}PHASE 3: DELETE UNUSED FILES${NC}"

if confirm "Do you want to proceed with deleting $UNUSED_FILES unused files?"; then
    deleted_count=0
    failed_count=0
    
    jq -r '.unused_files | .[] | .full_path' "$REPORT_FILE" | while read -r filepath; do
        if [ -f "$filepath" ]; then
            if rm "$filepath"; then
                deleted_count=$((deleted_count + 1))
            else
                failed_count=$((failed_count + 1))
                echo -e "${RED}Failed to delete: $filepath${NC}"
            fi
        else
            echo -e "${YELLOW}File not found: $filepath${NC}"
        fi
    done
    
    echo -e "${GREEN}✓ Successfully deleted: $deleted_count files${NC}"
    if [ $failed_count -gt 0 ]; then
        echo -e "${RED}✗ Failed to delete: $failed_count files${NC}"
    fi
else
    echo -e "${YELLOW}Skipped file deletion${NC}"
    echo "Backup preserved at: $BACKUP_DIR"
    exit 0
fi

echo ""

# Phase 4: Clean database records
echo -e "${YELLOW}PHASE 4: CLEAN DATABASE RECORDS${NC}"
echo "Removing database records for deleted files..."

if confirm "Do you want to delete database records for the unused files?"; then
    # Create a PHP script to clean database records
    cat > /tmp/cleanup_database.php <<'EOPHP'
<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$reportFile = __DIR__ . '/storage/app/unused_storage_report.json';
$report = json_decode(file_get_contents($reportFile), true);

$unusedIds = array_keys($report['unused_files']);
$chunks = array_chunk($unusedIds, 100);

$deleted = 0;
foreach ($chunks as $chunk) {
    $deleted += DB::table('media_files')->whereIn('id', $chunk)->delete();
}

echo "Deleted {$deleted} database records.\n";
EOPHP

    php /tmp/cleanup_database.php
    rm /tmp/cleanup_database.php
    
    echo -e "${GREEN}✓ Database records cleaned${NC}"
else
    echo -e "${YELLOW}Skipped database cleanup${NC}"
fi

echo ""

# Phase 5: Validation
echo -e "${YELLOW}PHASE 5: VALIDATION${NC}"
echo "Running validation checks..."

# Check if any of the deleted files still exist
remaining_files=$(jq -r '.unused_files | .[] | .full_path' "$REPORT_FILE" | while read -r filepath; do
    if [ -f "$filepath" ]; then
        echo "$filepath"
    fi
done | wc -l)

if [ $remaining_files -eq 0 ]; then
    echo -e "${GREEN}✓ All files successfully deleted${NC}"
else
    echo -e "${YELLOW}⚠ $remaining_files files still exist (may have been recreated)${NC}"
fi

# Check storage size after cleanup
NEW_STORAGE_SIZE=$(du -sh storage/app/public/ | cut -f1)
echo "New storage size: $NEW_STORAGE_SIZE"

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CLEANUP SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "✅ COMPLETED:"
echo "   - Files deleted: $UNUSED_FILES"
echo "   - Space reclaimed: $UNUSED_STORAGE"
echo "   - Backup location: $BACKUP_DIR"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Test the application thoroughly"
echo "2. Check for any broken images or media references"
echo "3. Monitor error logs for missing file issues"
echo "4. Keep backup for at least 7 days before permanent deletion"
echo ""
echo "🔧 ROLLBACK INSTRUCTIONS:"
echo "   To restore files: cp -r $BACKUP_DIR/* ."
echo "   To rollback database: You'll need to restore from database backup"
echo ""

echo -e "${GREEN}Storage cleanup completed successfully!${NC}"