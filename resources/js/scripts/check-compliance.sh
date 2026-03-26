#!/bin/bash

##############################################################################
# Mobile-First Compliance Checker
# Scans TSX files for critical mobile UX issues and generates report
#
# Usage: ./check-compliance.sh [module]
#   module: 'all' (default), 'cms', 'procurement', 'finance', 'catalog',
#           'inventory', 'sales', 'logistics', 'hrm', 'crm', 'settings'
#
# Author: Claude Code
# Date: 2026-01-21
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Issues found
TOTAL_ISSUES=0
TOTAL_FILES=0
CRITICAL_ISSUES=0

print_header() {
    echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║ $1                                        ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
}

print_section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

check_critical_mobile_ux() {
    local file="$1"
    local issues=0
    local critical=0

    # Initialize all counters to 0
    local action_icon_xs=0
    local action_icon_no_size=0
    local button_xs=0
    local fixed_font=0
    local text_non_responsive=0

    # 1. Touch target size (ActionIcon, Button with small size)
    local count=$(grep -c 'ActionIcon[^>]*size="xs"' "$file" 2>/dev/null) || count=0
    action_icon_xs=$((count + 0))

    count=$(grep -c '<ActionIcon[^>]*>' "$file" 2>/dev/null) || count=0
    action_icon_no_size=$((count + 0))

    # 2. Small buttons (size="xs" is too small for mobile)
    count=$(grep -c '<Button[^>]*size="xs"' "$file" 2>/dev/null) || count=0
    button_xs=$((count + 0))

    # 3. Fixed font sizes that don't scale (inline style with fontSize)
    count=$(grep -c 'style={{[^}]*fontSize:' "$file" 2>/dev/null) || count=0
    fixed_font=$((count + 0))

    # 4. Text without responsive classes
    count=$(grep -E 'size="(xs|sm|md|lg|xl)"' "$file" 2>/dev/null | grep -v 'className="text-' | wc -l | tr -d ' ')
    text_non_responsive=$((count + 0))

    # Calculate issues
    issues=$((action_icon_xs + action_icon_no_size + button_xs + fixed_font + text_non_responsive))
    critical=$((action_icon_xs + action_icon_no_size + button_xs))

    echo "$issues|$critical"
}

check_translations() {
    local file="$1"
    local issues=0

    # Check for hardcoded strings in JSX (simple heuristic)
    # Look for Text components with direct content
    local hardcoded_text=0
    local count=$(grep -E '">[A-Z][^<]{3,}</' "$file" 2>/dev/null | wc -l | tr -d ' ')
    hardcoded_text=$((count + 0))

    # Check if file uses translations but has hardcoded strings
    local has_translations=0
    count=$(grep -c 'useTranslation' "$file" 2>/dev/null) || count=0
    has_translations=$((count + 0))

    if [ "$has_translations" -gt 0 ] && [ "$hardcoded_text" -gt 10 ]; then
        issues=$((hardcoded_text / 2))  # Estimate
    fi

    echo "$issues"
}

check_inline_styles() {
    local file="$1"
    local issues=0

    # Count inline style attributes
    local count=$(grep -c 'style={{' "$file" 2>/dev/null) || count=0
    issues=$((count + 0))

    echo "$issues"
}

analyze_file() {
    local file="$1"
    local rel_path="${file#$PROJECT_ROOT/}"

    ((TOTAL_FILES++))

    # Run checks
    local mobile_ux=$(check_critical_mobile_ux "$file")
    local mobile_ux_issues=$(echo "$mobile_ux" | cut -d'|' -f1)
    local mobile_ux_critical=$(echo "$mobile_ux" | cut -d'|' -f2)

    local translation_issues=$(check_translations "$file")
    local style_issues=$(check_inline_styles "$file")

    local total_file_issues=$((mobile_ux_issues + translation_issues + style_issues))

    if [ $total_file_issues -gt 0 ]; then
        echo -e "${RED}✗${NC} $rel_path"
        echo -e "   Mobile UX: ${RED}$mobile_ux_issues issues${NC} ${YELLOW}($mobile_ux_critical critical)${NC}"
        echo -e "   Translations: ${YELLOW}$translation_issues potential hardcoded strings${NC}"
        echo -e "   Inline Styles: ${YELLOW}$style_issues found${NC}"

        ((TOTAL_ISSUES += total_file_issues))
        if [ $mobile_ux_critical -gt 0 ]; then
            ((CRITICAL_ISSUES += mobile_ux_critical))
        fi
    else
        echo -e "${GREEN}✓${NC} $rel_path"
        echo -e "   ${GREEN}Fully compliant${NC}"
    fi
}

analyze_directory() {
    local dir="$1"
    local dir_name=$(basename "$dir")

    print_header "Checking: $dir_name"

    if [ ! -d "$dir" ]; then
        echo -e "${YELLOW}Directory not found: $dir${NC}"
        return
    fi

    local tsx_count=$(find "$dir" -name "*.tsx" ! -name "*.backup*" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$tsx_count" -eq 0 ]; then
        echo -e "${YELLOW}No TSX files found${NC}"
        return
    fi

    echo "Found $tsx_count TSX files"
    echo ""

    # Use process substitution to avoid subshell issue with variable updates
    while IFS= read -r -d '' file; do
        analyze_file "$file"
    done < <(find "$dir" -name "*.tsx" ! -name "*.backup*" -print0 2>/dev/null)

    echo ""
}

# Main execution
main() {
    local module="${1:-all}"

    print_header "Mobile-First Compliance Checker"
    echo ""
    echo -e "Scanning for critical mobile UX issues..."
    echo -e "${NC}Checking for:"
    echo "  • Small touch targets (< 44x44px)"
    echo "  • Non-responsive typography"
    echo "  • Fixed font sizes"
    echo "  • Hardcoded strings"
    echo "  • Inline styles"
    echo ""

    # Define module directories
    local cms_dir="$PROJECT_ROOT/app/admin/cms"
    local procurement_dir="$PROJECT_ROOT/app/admin/procurement"
    local finance_dir="$PROJECT_ROOT/app/admin/finance"
    local catalog_dir="$PROJECT_ROOT/app/admin/catalog"
    local inventory_dir="$PROJECT_ROOT/app/admin/inventory"
    local sales_dir="$PROJECT_ROOT/app/admin/sales"
    local logistics_dir="$PROJECT_ROOT/app/admin/logistics"
    local hrm_dir="$PROJECT_ROOT/app/admin/hrm"
    local crm_dir="$PROJECT_ROOT/app/admin/crm"
    local settings_dir="$PROJECT_ROOT/app/admin/settings"

    # Process requested module(s)
    case "$module" in
        all)
            # Check all modules
            for dir in "$cms_dir" "$procurement_dir" "$finance_dir" "$catalog_dir" "$inventory_dir" "$sales_dir" "$logistics_dir" "$hrm_dir" "$crm_dir" "$settings_dir"; do
                if [ -n "$dir" ] && [ -d "$dir" ]; then
                    analyze_directory "$dir"
                fi
            done
            ;;
        cms)
            if [ -n "$cms_dir" ] && [ -d "$cms_dir" ]; then
                analyze_directory "$cms_dir"
            fi
            ;;
        procurement)
            if [ -n "$procurement_dir" ] && [ -d "$procurement_dir" ]; then
                analyze_directory "$procurement_dir"
            fi
            ;;
        finance)
            if [ -n "$finance_dir" ] && [ -d "$finance_dir" ]; then
                analyze_directory "$finance_dir"
            fi
            ;;
        catalog)
            if [ -n "$catalog_dir" ] && [ -d "$catalog_dir" ]; then
                analyze_directory "$catalog_dir"
            fi
            ;;
        inventory)
            if [ -n "$inventory_dir" ] && [ -d "$inventory_dir" ]; then
                analyze_directory "$inventory_dir"
            fi
            ;;
        sales)
            if [ -n "$sales_dir" ] && [ -d "$sales_dir" ]; then
                analyze_directory "$sales_dir"
            fi
            ;;
        logistics)
            if [ -n "$logistics_dir" ] && [d "$logistics_dir" ]; then
                analyze_directory "$logistics_dir"
            fi
            ;;
        hrm)
            if [ -n "$hrm_dir" ] && [ -d "$hrm_dir" ]; then
                analyze_directory "$hrm_dir"
            fi
            ;;
        crm)
            if [ -n "$crm_dir" ] && [ -d "$crm_dir" ]; then
                analyze_directory "$crm_dir"
            fi
            ;;
        settings)
            if [ -n "$settings_dir" ] && [d "$settings_dir" ]; then
                analyze_directory "$settings_dir"
            fi
            ;;
        *)
            echo -e "${RED}Invalid module: $module${NC}"
            echo ""
            echo "Available modules: all, cms, procurement, finance, catalog, inventory, sales, logistics, hrm, crm, settings"
            exit 1
            ;;
    esac

    # Print summary
    print_header "Compliance Report"
    echo -e "  Files Scanned:    ${BLUE}$TOTAL_FILES${NC}"
    echo -e "  Total Issues:      ${RED}$TOTAL_ISSUES${NC}"
    echo -e "  Critical Issues:   ${RED}$CRITICAL_ISSUES${NC} (touch targets)"
    echo ""

    if [ $TOTAL_ISSUES -eq 0 ]; then
        echo -e "${GREEN}🎉 All checked modules are fully mobile-first compliant!${NC}"
    else
        echo -e "${YELLOW}⚠️  Issues found. Run fix script:${NC}"
        echo -e "    ${CYAN}./fix-mobile-first.sh $module${NC}"
    fi
    echo ""
    print_header "Done!"
}

main "$@"
