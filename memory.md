# Project Structure Memory

## Current Working Directory
**Path**: `/Users/jakareaparvez/Sites/hooknhunt-api/`

## What This Project Contains
✅ **Laravel 12 API Backend** - REST API with enterprise modular architecture
✅ **React 18 Admin Panel** - Located in `resources/js/` subdirectory
✅ **Mobile Apps** - Capacitor 8 configuration for iOS/Android from admin panel

## What This Project Does NOT Contain
❌ **NO Next.js Storefront** - That is a separate project at `/Users/jakareaparvez/Sites/hooknhunt/storefront/`

## Key Points
- This is a Laravel API + React Admin Panel project only
- The storefront is a completely separate codebase
- When working on storefront, navigate to that project directory separately
- This CLAUDE.md should only document Laravel API and React Admin Panel

## Project Structure
```
hooknhunt-api/
├── app/                    # Laravel backend code
├── resources/js/           # React admin panel
├── routes/                 # API routes
├── database/               # Migrations
└── tests/                  # Pest tests
```
