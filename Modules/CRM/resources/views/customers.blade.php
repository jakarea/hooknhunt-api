<x-crm::layouts.master>
    @php
        $mode = $mode ?? 'list';
        $customer = $customer ?? null;
        $customerId = $customerId ?? null;
    @endphp

    @if($mode === 'list')
        {{-- LIST MODE: Show all customers --}}
        <div class="crm-customers-list">
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1 class="h3 mb-0">Customers</h1>
                    <a href="{{ route('crm.customers.create') }}" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Add Customer
                    </a>
                </div>

                {{-- Search and Filter --}}
                <div class="card mb-4">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-4">
                                <input type="text"
                                       class="form-control"
                                       placeholder="Search customers..."
                                       id="customerSearch"
                                       wire:model.debounce.300ms="search"
                                       placeholder="{{ __('Search by name or phone...') }}">
                            </div>
                            <div class="col-md-3">
                                <select class="form-select" id="customerTypeFilter">
                                    <option value="">All Types</option>
                                    <option value="retail">Retail</option>
                                    <option value="wholesale">Wholesale</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <button class="btn btn-outline-primary" onclick="fetchCustomers()">
                                    <i class="fas fa-search"></i> Search
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {{-- Customers Table --}}
                <div class="card">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th width="50px">ID</th>
                                        <th>Customer Name</th>
                                        <th>Phone</th>
                                        <th>Type</th>
                                        <th>Division</th>
                                        <th>District</th>
                                        <th>Thana/City</th>
                                        <th>Total Orders</th>
                                        <th>Total Spent</th>
                                        <th>Joined Date</th>
                                    </tr>
                                </thead>
                                <tbody id="customersTableBody">
                                    {{-- Customers will be loaded via AJAX --}}
                                    <tr>
                                        <td colspan="10" class="text-center py-5">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {{-- Pagination --}}
                    <div class="card-footer bg-light">
                        <nav aria-label="Page navigation">
                            <ul class="pagination justify-content-center mb-0" id="customersPagination">
                                {{-- Pagination will be loaded via AJAX --}}
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        </div>

    @elseif($mode === 'single')
        {{-- SINGLE MODE: Show individual customer --}}
        <div class="crm-customer-single">
            <div class="container-fluid py-4">
                {{-- Back button --}}
                <div class="mb-3">
                    <a href="{{ route('crm.customers') }}" class="btn btn-outline-secondary">
                        <i class="fas fa-arrow-left"></i> Back to Customers
                    </a>
                </div>

                @if($customer)
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Customer Details</h5>
                                <div class="dropdown">
                                    <button class="btn btn-light btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                        <i class="fas fa-ellipsis-v"></i> Actions
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li>
                                            <a class="dropdown-item" href="{{ route('crm.customers.edit', $customerId) }}">
                                                <i class="fas fa-edit"></i> Edit Customer
                                            </a>
                                        </li>
                                        <li>
                                            <a class="dropdown-item" href="#" onclick="deleteCustomer({{ $customerId }})">
                                                <i class="fas fa-trash"></i> Delete Customer
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                {{-- Customer Basic Info --}}
                                <div class="col-md-6">
                                    <h6 class="text-muted text-uppercase mb-3">Basic Information</h6>
                                    <table class="table table-sm">
                                        <tr>
                                            <th width="150">Customer ID:</th>
                                            <td>{{ $customer->customer_id }}</td>
                                        </tr>
                                        <tr>
                                            <th>Name:</th>
                                            <td>{{ $customer->customer_name }}</td>
                                        </tr>
                                        <tr>
                                            <th>Phone:</th>
                                            <td>
                                                <a href="tel:{{ $customer->customer_phone }}">
                                                    {{ $customer->customer_phone }}
                                                </a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <th>Type:</th>
                                            <td>
                                                <span class="badge bg-{{ $customer->customer_type === 'retail' ? 'success' : 'info' }}">
                                                    {{ ucfirst($customer->customer_type) }}
                                                </span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <th>Joined:</th>
                                            <td>{{ \Carbon\Carbon::parse($customer->customer_created_at)->format('d M Y') }}</td>
                                        </tr>
                                    </table>
                                </div>

                                {{-- Order Statistics --}}
                                <div class="col-md-6">
                                    <h6 class="text-muted text-uppercase mb-3">Order Statistics</h6>
                                    <div class="card card-light">
                                        <div class="card-body">
                                            <div class="row text-center">
                                                <div class="col-4">
                                                    <h3 class="mb-1">{{ $customer->totalOrders ?? 0 }}</h3>
                                                    <small class="text-muted">Total Orders</small>
                                                </div>
                                                <div class="col-4">
                                                    <h3 class="mb-1">৳{{ number_format($customer->totalSpent ?? 0, 0) }}</h3>
                                                    <small class="text-muted">Total Spent</small>
                                                </div>
                                                <div class="col-4">
                                                    <h3 class="mb-1">{{ $customer->loyaltyPoints ?? 0 }}</h3>
                                                    <small class="text-muted">Loyalty Points</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {{-- Tabs for additional information --}}
                            <ul class="nav nav-tabs mt-4" id="customerTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="orders-tab" data-bs-toggle="tab" data-bs-target="#orders" type="button" role="tab">
                                        Orders
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="activities-tab" data-bs-toggle="tab" data-bs-target="#activities" type="button" role="tab">
                                        Activities
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="addresses-tab" data-bs-toggle="tab" data-bs-target="#addresses" type="button" role="tab">
                                        Addresses
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="notes-tab" data-bs-toggle="tab" data-bs-target="#notes" type="button" role="tab">
                                        Notes
                                    </button>
                                </li>
                            </ul>

                            <div class="tab-content mt-3" id="customerTabContent">
                                <!-- Orders Tab -->
                                <div class="tab-pane fade show active" id="orders" role="tabpanel">
                                    <div class="card">
                                        <div class="card-body">
                                            <div id="customerOrders">
                                                <div class="text-center py-5">
                                                    <div class="spinner-border text-primary" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Activities Tab -->
                                <div class="tab-pane fade" id="activities" role="tabpanel">
                                    <div class="card">
                                        <div class="card-body">
                                            <div id="customerActivities">
                                                <p class="text-muted text-center">No activities recorded</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Addresses Tab -->
                                <div class="tab-pane fade" id="addresses" role="tabpanel">
                                    <div class="card">
                                        <div class="card-body">
                                            <div id="customerAddresses">
                                                <p class="text-muted text-center">No addresses found</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Notes Tab -->
                                <div class="tab-pane fade" id="notes" role="tabpanel">
                                    <div class="card">
                                        <div class="card-body">
                                            <textarea class="form-control"
                                                      rows="5"
                                                      placeholder="Add notes about this customer..."
                                                      id="customerNotes">{{ $customer->notes ?? '' }}</textarea>
                                            <button class="btn btn-primary mt-2" onclick="saveCustomerNotes()">
                                                <i class="fas fa-save"></i> Save Notes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                @else
                    <div class="alert alert-danger">
                        <strong>Error!</strong> Customer not found.
                    </div>
                @endif
            </div>
        </div>
    @endif

    {{-- JavaScript for SPA functionality --}}
    <script>
        // Fetch customers via AJAX
        function fetchCustomers(page = 1) {
            const search = document.getElementById('customerSearch')?.value || '';
            const type = document.getElementById('customerTypeFilter')?.value || '';

            fetch(`/api/v2/crm/customers?page=${page}&search=${encodeURIComponent(search)}&type=${type}`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    renderCustomersTable(data.data.data);
                    renderPagination(data.data);
                }
            })
            .catch(error => console.error('Error fetching customers:', error));
        }

        // Render customers table
        function renderCustomersTable(customers) {
            const tbody = document.getElementById('customersTableBody');
            tbody.innerHTML = customers.map(customer => `
                <tr>
                    <td>${customer.id}</td>
                    <td>
                        <a href="/crm/customers/${customer.id}" class="text-decoration-none fw-bold">
                            ${customer.name || customer.customer_name || 'N/A'}
                        </a>
                    </td>
                    <td>${customer.phone || customer.customer_phone || 'N/A'}</td>
                    <td>
                        <span class="badge bg-${customer.customerProfile?.type === 'wholesale' ? 'info' : 'success'}">
                            ${customer.customerProfile?.type || 'retail'}
                        </span>
                    </td>
                    <td>${customer.address?.division || '-'}</td>
                    <td>${customer.address?.district || '-'}</td>
                    <td>${customer.address?.thana || customer.address?.city || '-'}</td>
                    <td>${customer.customerProfile?.totalOrders || 0}</td>
                    <td>৳${customer.customerProfile?.totalSpent || 0}</td>
                    <td>${new Date(customer.created_at || customer.customer_created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        }

        // Render pagination
        function renderPagination(data) {
            const pagination = document.getElementById('customersPagination');
            // Simple pagination rendering
            pagination.innerHTML = `
                <li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="fetchCustomers(${data.current_page - 1}); return false;">&laquo;</a>
                </li>
                <li class="page-item active">
                    <span class="page-link">${data.current_page} of ${data.last_page}</span>
                </li>
                <li class="page-item ${data.current_page === data.last_page ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="fetchCustomers(${data.current_page + 1}); return false;">&raquo;</a>
                </li>
            `;
        }

        // Delete customer
        function deleteCustomer(id) {
            if (confirm('Are you sure you want to delete this customer?')) {
                fetch(`/api/v2/crm/customers/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Customer deleted successfully');
                        window.location.href = '/crm/customers';
                    }
                })
                .catch(error => console.error('Error deleting customer:', error));
            }
        }

        // Fetch customer orders
        function fetchCustomerOrders(customerId) {
            fetch(`/api/v2/crm/customers/${customerId}/orders`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    renderCustomerOrders(data.data);
                }
            })
            .catch(error => console.error('Error fetching orders:', error));
        }

        // Render customer orders
        function renderCustomerOrders(orders) {
            const container = document.getElementById('customerOrders');
            if (orders.length === 0) {
                container.innerHTML = '<p class="text-muted text-center py-3">No orders found</p>';
                return;
            }

            container.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.map(order => `
                                <tr>
                                    <td>${order.invoice_no}</td>
                                    <td>${new Date(order.created_at).toLocaleDateString()}</td>
                                    <td>৳${order.total_amount}</td>
                                    <td>
                                        <span class="badge bg-${order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'warning' : 'secondary'}">
                                            ${order.status}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Load customers on page load
        document.addEventListener('DOMContentLoaded', function() {
            @if($mode === 'list')
                fetchCustomers();
            @elseif($mode === 'single')
                fetchCustomerOrders({{ $customerId }});
            @endif
        });
    </script>
</x-crm::layouts.master>