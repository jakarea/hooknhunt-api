#!/bin/bash

##############################################################################
# Mobile-First Compliance Fix Script
# Applies responsive typography, removes inline styles, and ensures
# mobile-first PWA compliance across all admin modules
#
# Usage: ./fix-mobile-first.sh [module]
#   module: 'all' (default), 'media', 'procurement', 'finance', 'hrm', 'crm'
#
# Author: Claude Code
# Date: 2026-01-21
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_FILES=0
MODIFIED_FILES=0
TOTAL_CHANGES=0

# Module paths
BASE_DIR="/Applications/MAMP/htdocs/hooknhunt/hooknhunt-api/resources/js/app/admin"
MEDIA_DIR="$BASE_DIR/cms/media"
PROCUREMENT_DIR="$BASE_DIR/procurement"
FINANCE_DIR="$BASE_DIR/finance"
HRM_DIR="$BASE_DIR/hrm"
CRM_DIR="$BASE_DIR/crm"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${NC}  $1"
}

# Backup file before modifying
backup_file() {
    local file="$1"
    local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"

    if [ ! -f "$backup" ]; then
        cp "$file" "$backup"
        echo "  → Backup created: $(basename "$backup")"
    fi
}

# Apply responsive typography to a file
apply_responsive_typography() {
    local file="$1"
    local changes=0

    # Replace Mantine size props with Tailwind responsive classes
    # size="xs" → text-xs md:text-sm
    if sed -i '' 's/size="xs"/className="text-xs md:text-sm"/g' "$file" 2>/dev/null; then
        ((changes++))
    fi

    # size="sm" → text-sm md:text-base
    if sed -i '' 's/size="sm"/className="text-sm md:text-base"/g' "$file" 2>/dev/null; then
        ((changes++))
    fi

    # size="md" → text-base md:text-lg
    if sed -i '' 's/size="md"/className="text-base md:text-lg"/g' "$file" 2>/dev/null; then
        ((changes++))
    fi

    # size="lg" → text-lg md:text-xl lg:text-2xl
    if sed -i '' 's/size="lg"/className="text-lg md:text-xl lg:text-2xl"/g' "$file" 2>/dev/null; then
        ((changes++))
    fi

    # size="xl" → text-xl md:text-2xl lg:text-3xl
    if sed -i '' 's/size="xl"/className="text-xl md:text-2xl lg:text-3xl"/g' "$file" 2>/dev/null; then
        ((changes++))
    fi

    echo "$changes"
}

# Convert inline styles to Tailwind classes
convert_inline_styles() {
    local file="$1"
    local changes=0

    # Common flex replacements
    if sed -i '' 's/style={{ flex: 1 }}/className="flex-1"/g' "$file" 2>/dev/null; then
        ((changes++))
    fi

    if sed -i '' 's/style={{flex: 1}}/className="flex-1"/g' "$file" 2>/dev/null; then
        ((changes++))
    fi

    # Width replacements
    if sed -i '' 's/style={{width: \([0-9]*\) }}/w={\1}/g' "$file" 2>/dev/null; then
        ((changes++))
    fi

    # Height replacements
    if sed -i '' 's/style={{height: \([0-9]*\) }}/h={\1}/g' "$file" 2>/dev/null; then
        ((changes++))
    fi

    # Text alignment replacements
    if sed -i '' "s/style={{textAlign: 'right'}}/className=\"text-right\"/g" "$file" 2>/dev/null; then
        ((changes++))
    fi

    if sed -i '' "s/style={{textAlign: 'center'}}/className=\"text-center\"/g" "$file" 2>/dev/null; then
        ((changes++))
    fi

    if sed -i '' "s/style={{textAlign: 'left'}}/className=\"text-left\"/g" "$file" 2>/dev/null; then
        ((changes++))
    fi

    # Cursor pointer
    if sed -i '' 's/style={{ cursor: '\'"'"'pointer'\'"'"' }}/className="cursor-pointer"/g' "$file" 2>/dev/null; then
        ((changes++))
    fi

    echo "$changes"
}

# Process a single file
process_file() {
    local file="$1"
    local filename=$(basename "$file")

    ((TOTAL_FILES++))

    echo -n "  → ${filename}"

    # Backup file
    backup_file "$file"

    # Apply fixes
    local typo_changes=$(apply_responsive_typography "$file")
    local style_changes=$(convert_inline_styles "$file")
    local total_changes=$((typo_changes + style_changes))

    if [ $total_changes -gt 0 ]; then
        ((MODIFIED_FILES++))
        ((TOTAL_CHANGES += total_changes))
        echo -e " ${GREEN}[$total_changes changes]${NC}"
    else
        echo -e " ${YELLOW}[Already compliant]${NC}"
    fi
}

# Process all files in a directory
process_directory() {
    local dir="$1"
    local dir_name=$(basename "$dir")

    print_header "Processing: $dir_name Module"

    if [ ! -d "$dir" ]; then
        print_error "Directory not found: $dir"
        return
    fi

    local file_count=$(find "$dir" -name "*.tsx" ! -name "*.backup*" | wc -l | tr -d ' ')

    if [ "$file_count" -eq 0 ]; then
        print_warning "No TSX files found in $dir"
        echo ""
        return
    fi

    print_info "Found $file_count TSX files"
    echo ""

    # Process each TSX file
    find "$dir" -name "*.tsx" ! -name "*.backup*" -print0 | while IFS= read -r -d $'\0' file; do
        process_file "$file"
    done

    echo ""
}

##############################################################################
# Main Script
##############################################################################

main() {
    local module="${1:-all}"

    print_header "Mobile-First Compliance Fix Script"
    echo ""
    print_info "Target: $module"
    echo ""

    # Validate base directory
    if [ ! -d "$BASE_DIR" ]; then
        print_error "Base directory not found: $BASE_DIR"
        echo ""
        print_info "Please run this script from the project root or update the BASE_DIR path."
        exit 1
    fi

    # Process modules based on selection
    case "$module" in
        "media")
            process_directory "$MEDIA_DIR"
            ;;
        "procurement")
            process_directory "$PROCUREMENT_DIR"
            ;;
        "finance")
            process_directory "$FINANCE_DIR"
            ;;
        "hrm")
            process_directory "$HRM_DIR"
            ;;
        "crm")
            process_directory "$CRM_DIR"
            ;;
        "all")
            process_directory "$MEDIA_DIR"
            process_directory "$PROCUREMENT_DIR"
            process_directory "$FINANCE_DIR"
            process_directory "$HRM_DIR"
            process_directory "$CRM_DIR"
            ;;
        *)
            print_error "Invalid module: $module"
            echo ""
            print_info "Valid options: all, media, procurement, finance, hrm, crm"
            exit 1
            ;;
    esac

    # Print summary
    print_header "Summary"
    echo -e "  Total Files Scanned:  ${BLUE}${TOTAL_FILES}${NC}"
    echo -e "  Files Modified:       ${GREEN}${MODIFIED_FILES}${NC}"
    echo -e "  Total Changes Made:    ${GREEN}${TOTAL_CHANGES}${NC}"
    echo ""

    # Success message
    if [ $MODIFIED_FILES -gt 0 ]; then
        print_success "Mobile-first compliance fixes applied successfully!"
        echo ""
        print_info "Next Steps:"
        echo "  1. Test the application in browser (responsive mode)"
        echo "  2. Check for any visual issues on mobile/tablet"
        echo "  3. Run TypeScript compiler: npm run lint"
        echo "  4. Commit changes with message: 'feat: apply mobile-first compliance to [module]'"
        echo ""
        print_info "Backup files (.backup.*) have been created for safety."
        print_info "Remove them after verifying changes: find . -name '*.backup.*' -delete"
    else
        print_success "All files are already compliant! No changes needed."
    fi

    echo ""
    print_header "Done! ${GREEN}✓${NC}"
}

# Run main function with all arguments
main "$@"
