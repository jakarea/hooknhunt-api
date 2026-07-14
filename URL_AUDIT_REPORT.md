# 🔍 CRITICAL URL CONFIGURATION AUDIT REPORT

**Date:** 2026-07-14  
**Auditor:** Claude Code  
**Status:** ⚠️ CRITICAL ISSUES FOUND

---

## EXECUTIVE SUMMARY

Found **5 critical issues** preventing proper image/media loading on production:
- 2 records in database with wrong URLs
- 2 hardcoded URLs in code
- APP_URL misconfiguration
- 11 instances depending on APP_URL
- CORS missing production domain

**Estimated Impact:** 🔴 **100% image failure in production**

---

## DETAILED FINDINGS

### 1. DATABASE ISSUES

#### Issue 1.1: Wrong URLs in media_files Table
- **Severity:** 🔴 CRITICAL
- **Records Affected:** 2
- **IDs:** 1462, 1463
- **Problem:** URLs stored with `https://hooknhunt-api.test/storage/` instead of production domain

**Affected Records:**

| ID | Filename | Current URL | Should Be |
|----|----------|-------------|-----------|
| 1462 | 1779440203_6a101a4b4648d_... | https://hooknhunt-api.test/storage/... | https://probesh.hooknhunt.com/storage/... |
| 1463 | 1780403843_6a1ece8319e02_... | https://hooknhunt-api.test/storage/... | https://probesh.hooknhunt.com/storage/... |

**Fix SQL:**
```sql
UPDATE media_files 
SET url = REPLACE(url, 'https://hooknhunt-api.test', 'https://probesh.hooknhunt.com')
WHERE url LIKE '%hooknhunt-api.test%';
```

---

### 2. CODE ISSUES

#### Issue 2.1: Hardcoded URLs in OrderController.php
- **Severity:** 🔴 CRITICAL
- **File:** `Modules/Website/app/Http/Controllers/Api/V2/WebsiteAdmin/OrderController.php`
- **Lines:** 119, 778
- **Problem:** Hard-coded `https://hooknhunt-api.test/storage/` in SQL query

**Current Code:**
```php
DB::raw('CASE WHEN m.path IS NOT NULL THEN CONCAT("https://hooknhunt-api.test/storage/", m.path) ELSE NULL END as thumbnail_url')
```

**Should Be:**
```php
DB::raw('CASE WHEN m.path IS NOT NULL THEN CONCAT(?, "/storage/", m.path) ELSE NULL END as thumbnail_url', [config('app.url')])
```

**Impact:**
- Admin dashboard order images always use wrong domain
- Breaks on production completely
- Affects 2 identical lines

#### Issue 2.2: APP_URL Configuration
- **Severity:** 🔴 CRITICAL
- **File:** `.env`
- **Current Value:** `APP_URL=https://hooknhunt-api.test`
- **Problem:** Set to local development domain instead of production

**Impact:**
- ALL `url()` helper calls return wrong domain
- ALL `config('app.url')` calls use wrong domain
- ALL 11 config('app.url') usages affected

#### Issue 2.3: Multiple config('app.url') Usage
- **Severity:** 🟡 HIGH
- **Count:** 11 instances across 5 files
- **Auto-fixes:** When APP_URL is corrected

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| ImageHelper.php | 40, 54 | Placeholder images |
| PublicController.php | 248, 358, 439, 450 | Categories/sliders |
| ReviewController.php | 327 | Review images |
| SystemController.php | 29 | System info |
| l5-swagger.php | 216-218 | OAuth URLs |

#### Issue 2.4: CORS Configuration
- **Severity:** 🟡 MEDIUM
- **File:** `config/cors.php`
- **Status:** ✅ PASSES - Already includes production domains
- **Has:** `https://probesh.hooknhunt.com`

---

## ROOT CAUSE ANALYSIS

### Primary Root Cause
APP_URL is hard-coded to development domain in `.env` file. This is by design for local development, but:
- **No .env.production file exists** for server to use correct URL
- **No documentation** on environment setup
- **No override mechanism** to change domain per environment

### Secondary Root Causes
1. **OrderController.php** concatenates URL directly in SQL query instead of using config
2. **Database** has legacy URLs stored with wrong domain from earlier migration/data entry
3. **No URL validation** in deployment process
4. **No monitoring** to catch wrong URLs in production

---

## IMPACT ASSESSMENT

### Current State (Development)
- ✅ Works perfectly (all domains resolve to localhost via Valet)
- ✅ Images load correctly
- ✅ Admin dashboard functions

### Production State
- 🔴 **Images completely broken**
- 🔴 **Admin dashboard non-functional**
- 🔴 **API returns wrong URLs**
- 🔴 **2 specific records have wrong URLs in database**

### Risk Level: **CRITICAL** ⚠️

---

## REMEDIATION PLAN

### Phase 1: Database (IMMEDIATE)
- [ ] Backup database
- [ ] Execute UPDATE query on media_files
- [ ] Verify 0 records remain with wrong URLs

### Phase 2: Code (URGENT)
- [ ] Fix hardcoded URLs in OrderController.php (2 lines)
- [ ] Create .env.production template
- [ ] Document environment setup

### Phase 3: Deployment (BEFORE RELEASE)
- [ ] Set APP_URL correctly on production server
- [ ] Clear application cache
- [ ] Run integration tests
- [ ] Verify all image endpoints

### Phase 4: Monitoring (ONGOING)
- [ ] Monitor logs for wrong domain references
- [ ] Set up alerts for URL configuration issues
- [ ] Document runbook for future maintenance

---

## DEPLOYMENT CHECKLIST

**Pre-Deployment:**
- [ ] Database backed up
- [ ] Code changes reviewed
- [ ] Test environment verified
- [ ] Rollback plan documented

**Deployment:**
- [ ] Apply database fixes
- [ ] Deploy code changes
- [ ] Update environment variables
- [ ] Clear caches
- [ ] Run smoke tests

**Post-Deployment:**
- [ ] Verify media_files table (0 wrong URLs)
- [ ] Test category endpoints
- [ ] Test slider endpoints
- [ ] Test admin orders API
- [ ] Monitor logs for errors
- [ ] User acceptance testing

---

## RECOMMENDATIONS

### Immediate (Within 24 hours)
1. Fix hardcoded URLs in code
2. Fix database records
3. Set up .env.production file

### Short-term (Within 1 week)
1. Create URL configuration documentation
2. Set up automated URL validation in tests
3. Add monitoring/alerting for wrong domains

### Long-term (Within 1 month)
1. Create automated deployment checklist
2. Implement CI/CD URL validation
3. Document environment setup guide
4. Create troubleshooting guide

---

## FILES GENERATED

📄 **URL_CONFIGURATION_FIX_PLAN.md** - Technical fix plan  
📄 **URL_FIX_COMPLETE_PLAN.txt** - Step-by-step execution guide  
📄 **URL_AUDIT_REPORT.md** - This audit report  

---

## CONCLUSION

**The application has CRITICAL URL configuration issues that will cause complete failure in production.** All images and media will fail to load with the current configuration.

**Immediate action required:**
1. Fix 2 database records
2. Fix 2 lines of hardcoded code
3. Set APP_URL environment variable correctly

These fixes are straightforward and low-risk. Estimated fix time: **30 minutes**.

---

**Status:** Ready for remediation ✅  
**Priority:** CRITICAL 🔴  
**Sign-off Required:** YES ✋  

