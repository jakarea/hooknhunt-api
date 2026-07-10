#!/bin/bash

# COMPREHENSIVE CLEANUP SCRIPT WITH RISK LEVELS
# Run this script to clean unused files safely
# Always backup before running!

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create backup directory
BACKUP_DIR="./cleanup_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}UNUSED FILES CLEANUP SCRIPT${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Backup directory: ${GREEN}$BACKUP_DIR${NC}"
echo ""

# Function to ask for confirmation
confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# ============================================
# LEVEL 1: SAFE DELETIONS (High Confidence)
# ============================================
echo -e "${GREEN}LEVEL 1: SAFE DELETIONS${NC}"
echo "These files are confirmed unused and can be safely deleted:"
echo ""

echo "✅ Already completed in previous step:"
echo "   - .DS_Store files (5 files deleted)"
echo "   - not-using-dashboard directory (2 files deleted)"
echo "   - [id].bak backup directory (2 files deleted)"
echo "   - App.css (1 file deleted)"
echo ""

# ============================================
# LEVEL 2: LOW RISK (Documentation/Demo Files)
# ============================================
echo -e "${YELLOW}LEVEL 2: LOW RISK DELETIONS${NC}"
echo "These files appear to be documentation, demos, or testing:"
echo ""

echo "Files to consider removing:"
echo "1. resources/js/app/admin/permission-examples/page.tsx"
echo "   - Documentation page for permissions system"
echo "2. resources/js/app/admin/procurement/micro-interactions-demo/page.tsx"
echo "   - Demo page for micro-interactions"
echo "3. resources/js/components/ui/AnimatedComponents.tsx"
echo "   - Only used by demo page"
echo ""

if confirm "Do you want to remove these documentation/demo files?"; then
    echo "Creating backup..."
    cp -r resources/js/app/admin/permission-examples "$BACKUP_DIR/" 2>/dev/null || true
    cp -r resources/js/app/admin/procurement/micro-interactions-demo "$BACKUP_DIR/" 2>/dev/null || true
    cp resources/js/components/ui/AnimatedComponents.tsx "$BACKUP_DIR/" 2>/dev/null || true
    
    echo "Removing files..."
    rm -rf resources/js/app/admin/permission-examples
    rm -rf resources/js/app/admin/procurement/micro-interactions-demo
    rm -f resources/js/components/ui/AnimatedComponents.tsx
    
    echo -e "${GREEN}✓ Documentation/demo files removed${NC}"
else
    echo -e "${YELLOW}Skipped documentation/demo files${NC}"
fi

echo ""

# ============================================
# LEVEL 3: MEDIUM RISK (Unused Components)
# ============================================
echo -e "${YELLOW}LEVEL 3: MEDIUM RISK DELETIONS${NC}"
echo "These components have no direct references:"
echo ""

echo "Files to consider removing:"
echo "1. resources/js/components/category-select-split.tsx"
echo "2. resources/js/components/category-selector-modal.tsx"
echo "3. resources/js/components/dashboard-quote.tsx"
echo "4. resources/js/components/employee-attendance-history.tsx"
echo "5. resources/js/components/form-wrapper.tsx"
echo "6. resources/js/components/responsive-data-view.tsx"
echo "7. resources/js/components/theme-provider.tsx"
echo ""

if confirm "Do you want to remove these unused components?"; then
    echo "Creating backup..."
    cp resources/js/components/category-select-split.tsx "$BACKUP_DIR/" 2>/dev/null || true
    cp resources/js/components/category-selector-modal.tsx "$BACKUP_DIR/" 2>/dev/null || true
    cp resources/js/components/dashboard-quote.tsx "$BACKUP_DIR/" 2>/dev/null || true
    cp resources/js/components/employee-attendance-history.tsx "$BACKUP_DIR/" 2>/dev/null || true
    cp resources/js/components/form-wrapper.tsx "$BACKUP_DIR/" 2>/dev/null || true
    cp resources/js/components/responsive-data-view.tsx "$BACKUP_DIR/" 2>/dev/null || true
    cp resources/js/components/theme-provider.tsx "$BACKUP_DIR/" 2>/dev/null || true
    
    echo "Removing files..."
    rm -f resources/js/components/category-select-split.tsx
    rm -f resources/js/components/category-selector-modal.tsx
    rm -f resources/js/components/dashboard-quote.tsx
    rm -f resources/js/components/employee-attendance-history.tsx
    rm -f resources/js/components/form-wrapper.tsx
    rm -f resources/js/components/responsive-data-view.tsx
    rm -f resources/js/components/theme-provider.tsx
    
    echo -e "${GREEN}✓ Unused components removed${NC}"
else
    echo -e "${YELLOW}Skipped unused components${NC}"
fi

echo ""

# ============================================
# LEVEL 4: UNUSED HOOKS (Medium Risk)
# ============================================
echo -e "${YELLOW}LEVEL 4: UNUSED HOOKS${NC}"
echo "These hooks have no references:"
echo ""

echo "Files to consider removing:"
echo "1. resources/js/hooks/use-api.ts"
echo "2. resources/js/hooks/use-mobile.ts"
echo "3. resources/js/hooks/useZodValidation.ts"
echo ""

if confirm "Do you want to remove these unused hooks?"; then
    echo "Creating backup..."
    cp resources/js/hooks/use-api.ts "$BACKUP_DIR/" 2>/dev/null || true
    cp resources/js/hooks/use-mobile.ts "$BACKUP_DIR/" 2>/dev/null || true
    cp resources/js/hooks/useZodValidation.ts "$BACKUP_DIR/" 2>/dev/null || true
    
    echo "Removing files..."
    rm -f resources/js/hooks/use-api.ts
    rm -f resources/js/hooks/use-mobile.ts
    rm -f resources/js/hooks/useZodValidation.ts
    
    echo -e "${GREEN}✓ Unused hooks removed${NC}"
else
    echo -e "${YELLOW}Skipped unused hooks${NC}"
fi

echo ""

# ============================================
# LEVEL 5: UNUSED STORES (Medium Risk)
# ============================================
echo -e "${YELLOW}LEVEL 5: UNUSED STORES${NC}"
echo "Note: procurementOrdersStore IS used, keeping duplicate:"
echo ""

echo "Files to consider removing:"
echo "1. resources/js/stores/deliveryStore.ts"
echo "2. resources/js/stores/orderBadgeStore.ts"
echo "3. resources/js/stores/rolesStore.ts"
echo ""

if confirm "Do you want to remove these unused stores?"; then
    echo "Creating backup..."
    cp resources/js/stores/deliveryStore.ts "$BACKUP_DIR/" 2>/dev/null || true
    cp resources/js/stores/orderBadgeStore.ts "$BACKUP_DIR/" 2>/dev/null || true
    cp resources/js/stores/rolesStore.ts "$BACKUP_DIR/" 2>/dev/null || true
    
    echo "Removing files..."
    rm -f resources/js/stores/deliveryStore.ts
    rm -f resources/js/stores/orderBadgeStore.ts
    rm -f resources/js/stores/rolesStore.ts
    
    echo -e "${GREEN}✓ Unused stores removed${NC}"
else
    echo -e "${YELLOW}Skipped unused stores${NC}"
fi

echo ""

# ============================================
# LEVEL 6: DUPLICATE FILES (Low Risk)
# ============================================
echo -e "${YELLOW}LEVEL 6: DUPLICATE FILES${NC}"
echo "Found duplicate store file:"
echo ""

echo "Files to consider removing:"
echo "1. resources/js/modules/procurement/stores/procurementOrdersStore.ts"
echo "   - Duplicate of resources/js/stores/procurementOrdersStore.ts"
echo "   - The original is actively used"
echo ""

if confirm "Do you want to remove the duplicate store?"; then
    echo "Creating backup..."
    cp resources/js/modules/procurement/stores/procurementOrdersStore.ts "$BACKUP_DIR/" 2>/dev/null || true
    
    echo "Removing duplicate file..."
    rm -f resources/js/modules/procurement/stores/procurementOrdersStore.ts
    
    echo -e "${GREEN}✓ Duplicate file removed${NC}"
else
    echo -e "${YELLOW}Skipped duplicate file${NC}"
fi

echo ""

# ============================================
# NPM PACKAGE CLEANUP (Requires Manual Review)
# ============================================
echo -e "${RED}LEVEL 7: NPM PACKAGE CLEANUP${NC}"
echo "These packages appear to be unused but require manual verification:"
echo ""

echo "Potentially unused packages:"
echo "- @capacitor/* (mobile app framework - 4 packages)"
echo "- @tanstack/react-query* (data fetching - 2 packages)"
echo "- @hookform/resolvers, react-hook-form (form validation)"
echo "- date-fns (alternative to dayjs)"
echo "- lucide-react (using @tabler/icons-react instead)"
echo "- recharts, immer, idb-keyval, quill-image-resize-module"
echo ""
echo "⚠️  These require manual verification before removal!"
echo "   Run: npm ls <package_name> to check dependencies"
echo ""

# ============================================
# STORAGE FILE CLEANUP (Requires Database Queries)
# ============================================
echo -e "${RED}LEVEL 8: STORAGE FILE CLEANUP${NC}"
echo "Storage files require database verification:"
echo ""

echo "Storage analysis results:"
echo "- Total storage files: 1,766 files"
echo "- Total storage size: 266 MB"
echo "- Categories requiring verification:"
echo "  - Media uploads: 1,484 files"
echo "  - Media library: 205 files"
echo "  - Gallery images: 23 files"
echo "  - Thumbnails: 34 files"
echo "  - Categories: 11 files"
echo "  - Others: 9 files"
echo ""
echo "⚠️  Run the database queries in storage_analysis_queries.sql"
echo "   to identify truly unused storage files"
echo ""

# ============================================
# BUILD AND VALIDATION
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}BUILD AND VALIDATION${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if confirm "Do you want to run build validation?"; then
    echo "Running build validation..."
    
    echo "1. Running TypeScript type check..."
    if npm run typecheck 2>&1 | tee -a "$BACKUP_DIR/typecheck.log"; then
        echo -e "${GREEN}✓ TypeScript check passed${NC}"
    else
        echo -e "${RED}✗ TypeScript check failed${NC}"
        echo "Check $BACKUP_DIR/typecheck.log for details"
    fi
    
    echo ""
    echo "2. Running linter..."
    if npm run lint 2>&1 | tee -a "$BACKUP_DIR/lint.log"; then
        echo -e "${GREEN}✓ Linter check passed${NC}"
    else
        echo -e "${RED}✗ Linter check failed${NC}"
        echo "Check $BACKUP_DIR/lint.log for details"
    fi
    
    echo ""
    echo "3. Running build..."
    if npm run build 2>&1 | tee -a "$BACKUP_DIR/build.log"; then
        echo -e "${GREEN}✓ Build successful${NC}"
    else
        echo -e "${RED}✗ Build failed${NC}"
        echo "Check $BACKUP_DIR/build.log for details"
        echo "You may need to restore from backup"
    fi
else
    echo -e "${YELLOW}Skipped build validation${NC}"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CLEANUP SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "✅ SAFE DELETIONS COMPLETED:"
echo "   - .DS_Store files: 5 files"
echo "   - Unused directories: 2 directories"
echo "   - Backup files: 1 directory"
echo "   - Unused CSS: 1 file"
echo ""

echo "⚠️  FILES REQUIRING MANUAL REVIEW:"
echo "   - Storage files: 1,766 files (run database queries)"
echo "   - NPM packages: 18 packages (verify usage)"
echo "   - PHP backend: 1 potentially unused controller"
echo ""

echo "📦 BACKUP LOCATION:"
echo "   - $BACKUP_DIR"
echo ""

echo "📋 NEXT STEPS:"
echo "1. Run database queries: storage_analysis_queries.sql"
echo "2. Review and remove unused storage files"
echo "3. Verify npm package usage before removal"
echo "4. Test application thoroughly after cleanup"
echo ""

echo -e "${GREEN}Cleanup process completed!${NC}"
echo "Please review the backup directory and test your application."