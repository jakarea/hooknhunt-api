# Hook & Hunt API - Developer Guide

## Project Overview

**Hook & Hunt** is a comprehensive, headless e-commerce ERP system designed for multi-channel sales operations. This repository contains the **Laravel API backend**, currently operating on **Version 2 (Enterprise Modular Architecture)**.

- **Framework**: Laravel 11/12
- **Architecture**: Modular Monolith (V2)
- **Authentication**: Laravel Sanctum
- **Documentation**: L5-Swagger (OpenAPI)

## Architecture & Directory Structure

The application has migrated to a **V2 Modular Architecture**. Code organization reflects this shift.

### Key Directories

- **Controllers**: `app/Http/Controllers/Api/V2/` - All active API logic resides here, organized by domain (e.g., `Crm`, `Hrm`, `Auth`).
- **Routes**: `routes/api.php` - Contains all V2 API definitions, grouped by functional modules.
- **Models**: `app/Models/` - Eloquent models.
- **Migrations**: `database/migrations/` - Database schema definitions.

### Modules

The API is segmented into logical modules:
- **Auth**: Customer & Admin authentication, Profile management.
- **System**: Roles, Permissions, Settings, Units.
- **Catalog**: Products, Categories, Brands, Pricing.
- **Inventory**: Warehouses, Stock, Adjustments.
- **Sales & POS**: Orders, Customers, Point of Sale, Returns.
- **Logistics**: Shipments, Couriers, Workflow management.
- **HRM**: Departments, Employees, Attendance, Payroll.
- **CRM**: Leads, Activities, Campaigns.
- **Finance**: Accounts, Expenses, Journals.
- **CMS**: Content management, Media, Support Tickets.

## Key Data Models (V2)

**Critical Note**: This V2 schema differs significantly from previous versions (V1).

### 1. Product (`products`)
- **Category**: Belongs to a single `Category` via `category_id`.
- **Media**: `thumbnail_id` (Foreign Key) and `gallery_images` (JSON array of media IDs).
- **Status**: `status` enum (`draft`, `published`, `archived`).

### 2. Product Variant (`product_variants`)
- **Identity**: `sku` (Unique), `variant_name`.
- **Status**: `is_active` (boolean) - *Note: V1 lacked a status column on variants, but V2 has `is_active`.*
- **Pricing**: `default_retail_price`, `default_purchase_cost`, etc.
- **Inventory**: Relationships to `inventory` table for stock tracking.

## Development Workflow

### Prerequisites
- PHP 8.2+
- Composer
- Node.js & NPM (for frontend assets/Vite)
- MySQL

### Setup Commands
```bash
# Install PHP dependencies
composer install

# Setup Environment
cp .env.example .env
php artisan key:generate

# Database Setup (Run migrations and seeds)
php artisan migrate --seed

# Install Frontend Assets (if needed)
npm install && npm run build
```

### Running the Application
```bash
# Start the development server (runs Laravel, Queue, and Vite)
composer run dev
```

### Testing
This project uses **Pest PHP** for testing.

```bash
# Run all tests
composer run test

# Run specific test
./vendor/bin/pest tests/Feature/ProductTest.php
```

## API Guidelines

1.  **Response Format**: All API responses should follow a consistent JSON structure (success/data/message).
2.  **Versioning**: All new endpoints must be placed under `api/v2/`.
3.  **Strict Typing**: Use strict typing in Controller methods and FormRequests.
4.  **Authorization**:
    - **Public**: `v2/public/*`
    - **Customer**: `v2/auth/*` (Sanctum)
    - **Admin/Staff**: `v2/admin/*` or module routes (Sanctum + Permission Middleware).
