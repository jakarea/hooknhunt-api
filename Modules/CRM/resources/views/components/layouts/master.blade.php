<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">

        <title>CRM Module - {{ config('app.name', 'Laravel') }}</title>

        <meta name="description" content="{{ $description ?? '' }}">
        <meta name="keywords" content="{{ $keywords ?? '' }}">
        <meta name="author" content="{{ $author ?? '' }}">

        <!-- Mantine UI CSS -->
        <link href="https://cdn.jsdelivr.net/npm/@mantine/core@7.0.0/styles.css" rel="stylesheet">

        <!-- Tabler Icons (Mantine recommended) -->
        <link href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" rel="stylesheet">

        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                background-color: #f8f9fa;
            }

            .container-fluid {
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }

            .card {
                background: white;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                margin-bottom: 20px;
            }

            .card-body {
                padding: 20px;
            }

            .card-header {
                background: white;
                border-bottom: 1px solid #e9ecef;
                padding: 15px 20px;
                border-radius: 8px 8px 0 0;
            }

            /* Table Styling */
            .table-responsive {
                overflow-x: auto;
            }

            .table {
                width: 100%;
                border-collapse: collapse;
                margin: 0;
            }

            .table thead th {
                background-color: #f8f9fa;
                color: #495057;
                font-weight: 600;
                text-align: left;
                padding: 12px 16px;
                border-bottom: 2px solid #dee2e6;
                font-size: 0.875rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .table tbody td {
                padding: 12px 16px;
                border-bottom: 1px solid #e9ecef;
                vertical-align: middle;
            }

            .table tbody tr:hover {
                background-color: #f8f9fa;
            }

            /* Badge Styling */
            .badge {
                display: inline-block;
                padding: 4px 12px;
                font-size: 0.75rem;
                font-weight: 600;
                line-height: 1;
                color: #fff;
                text-align: center;
                white-space: nowrap;
                vertical-align: baseline;
                border-radius: 4px;
            }

            .bg-success {
                background-color: #40c057;
            }

            .bg-info {
                background-color: #228be6;
            }

            .bg-primary {
                background-color: #228be6;
            }

            /* Button Styling */
            .btn {
                display: inline-block;
                font-weight: 500;
                line-height: 1.5;
                color: #212529;
                text-align: center;
                text-decoration: none;
                vertical-align: middle;
                cursor: pointer;
                user-select: none;
                background-color: transparent;
                border: 1px solid transparent;
                padding: 0.5rem 1rem;
                font-size: 1rem;
                border-radius: 4px;
                transition: all 0.15s ease-in-out;
            }

            .btn-primary {
                color: #fff;
                background-color: #228be6;
                border-color: #228be6;
            }

            .btn-primary:hover {
                background-color: #1c7ed6;
                border-color: #1c7ed6;
            }

            .btn-outline-primary {
                color: #228be6;
                border-color: #228be6;
            }

            .btn-outline-primary:hover {
                color: #fff;
                background-color: #228be6;
                border-color: #228be6;
            }

            .btn-outline-secondary {
                color: #868e96;
                border-color: #868e96;
            }

            .btn-outline-secondary:hover {
                color: #fff;
                background-color: #868e96;
                border-color: #868e96;
            }

            /* Alert Styling */
            .alert {
                position: relative;
                padding: 1rem 1.25rem;
                margin-bottom: 1rem;
                border: 1px solid transparent;
                border-radius: 4px;
            }

            .alert-warning {
                color: #664d03;
                background-color: #fff3cd;
                border-color: #ffc107;
            }

            .alert-heading {
                color: inherit;
                font-size: 1.25rem;
                margin-bottom: 0.5rem;
                font-weight: 600;
            }

            /* Form Controls */
            .form-control {
                display: block;
                width: 100%;
                padding: 0.5rem 0.75rem;
                font-size: 1rem;
                font-weight: 400;
                line-height: 1.5;
                color: #212529;
                background-color: #fff;
                background-clip: padding-box;
                border: 1px solid #ced4da;
                border-radius: 4px;
                transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
            }

            .form-control:focus {
                border-color: #228be6;
                outline: 0;
                box-shadow: 0 0 0 0.2rem rgba(34, 139, 230, 0.25);
            }

            .form-select {
                display: block;
                width: 100%;
                padding: 0.5rem 2.25rem 0.5rem 0.75rem;
                font-size: 1rem;
                font-weight: 400;
                line-height: 1.5;
                color: #212529;
                background-color: #fff;
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
                background-repeat: no-repeat;
                background-position: right 0.75rem center;
                background-size: 16px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
            }

            /* Pagination */
            .pagination {
                display: flex;
                list-style: none;
                margin: 0;
                padding: 0;
            }

            .page-item {
                margin: 0 2px;
            }

            .page-link {
                position: relative;
                display: block;
                padding: 0.5rem 0.75rem;
                color: #228be6;
                text-decoration: none;
                background-color: #fff;
                border: 1px solid #dee2e6;
                border-radius: 4px;
            }

            .page-link:hover {
                color: #1c7ed6;
                background-color: #e9ecef;
                border-color: #dee2e6;
            }

            .page-item.active .page-link {
                color: #fff;
                background-color: #228be6;
                border-color: #228be6;
            }

            .page-item.disabled .page-link {
                color: #6c757d;
                pointer-events: none;
                background-color: #fff;
                border-color: #dee2e6;
            }

            /* Utility Classes */
            .d-flex {
                display: flex !important;
            }

            .justify-content-between {
                justify-content: space-between !important;
            }

            .align-items-center {
                align-items: center !important;
            }

            .mb-0 {
                margin-bottom: 0 !important;
            }

            .mb-4 {
                margin-bottom: 1.5rem !important;
            }

            .text-center {
                text-align: center !important;
            }

            .py-4 {
                padding-top: 1.5rem !important;
                padding-bottom: 1.5rem !important;
            }

            .py-5 {
                padding-top: 3rem !important;
                padding-bottom: 3rem !important;
            }

            .mx-4 {
                margin-left: 1.5rem !important;
                margin-right: 1.5rem !important;
            }

            .text-decoration-none {
                text-decoration: none !important;
            }

            .fw-bold {
                font-weight: 600 !important;
            }

            .row {
                display: flex;
                flex-wrap: wrap;
                margin-right: -10px;
                margin-left: -10px;
            }

            .col-md-4,
            .col-md-3,
            .col-md-2,
            .col-md-6 {
                position: relative;
                width: 100%;
                padding-right: 10px;
                padding-left: 10px;
            }

            @media (min-width: 768px) {
                .col-md-2 {
                    flex: 0 0 auto;
                    width: 16.666667%;
                }

                .col-md-3 {
                    flex: 0 0 auto;
                    width: 25%;
                }

                .col-md-4 {
                    flex: 0 0 auto;
                    width: 33.333333%;
                }

                .col-md-6 {
                    flex: 0 0 auto;
                    width: 50%;
                }
            }

            /* Icons */
            i {
                vertical-align: middle;
            }

            /* Links */
            a {
                color: #228be6;
                text-decoration: none;
            }

            a:hover {
                color: #1c7ed6;
            }
        </style>

        {{-- Vite CSS --}}
        {{-- {{ module_vite('build-crm', 'resources/assets/sass/app.scss') }} --}}
    </head>

    <body>
        {{ $slot }}

        {{-- Vite JS --}}
        {{-- {{ module_vite('build-crm', 'resources/assets/js/app.js') }} --}}
    </body>
</html>
