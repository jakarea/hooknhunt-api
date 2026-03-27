# ADR-006: Use Domain-Driven Design (DDD) Folder Structure

## Status
Accepted

## Context
As the ERP system grows, we need to organize code by **business domain**, not just technical layers. Traditional MVC structure becomes unmanageable at scale.

## Decision
Use **Domain-Driven Design (DDD) Lite** folder structure in Laravel backend.

## Consequences

### Positive
- **Scalable**: Easy to add new features without touching existing code
- **Clear boundaries**: Each domain is isolated (Billing, Inventory, Auth, etc.)
- **Onboarding**: New devs can find code by business feature
- **Team collaboration**: Multiple teams can work on different domains
- **Testable**: Each domain has its own tests

### Negative
- **More folders**: Deeper folder structure
- **Learning curve**: Developers need to understand DDD concepts
- **Initial setup**: More work upfront for small projects

## Folder Structure

```
app/
├── Domain/
│   ├── Procurement/
│   │   ├── Controllers/
│   │   │   ├── ProcurementController.php
│   │   │   └── PurchaseOrderController.php
│   │   ├── Services/
│   │   │   ├── ProcurementService.php
│   │   │   └── PurchaseOrderService.php
│   │   ├── Repositories/
│   │   │   ├── ProcurementRepository.php
│   │   │   └── PurchaseOrderRepository.php
│   │   ├── DTOs/
│   │   │   ├── CreateProcurementProductDTO.php
│   │   │   └── UpdatePurchaseOrderDTO.php
│   │   └── Models/
│   │       ├── ProcurementProduct.php
│   │       └── PurchaseOrder.php
│   ├── Finance/
│   │   ├── Controllers/
│   │   ├── Services/
│   │   ├── Repositories/
│   │   └── Models/
│   └── Catalog/
│       ├── Controllers/
│       ├── Services/
│       └── Repositories/
```

## Why Not Traditional MVC?

### Traditional Structure (DON'T USE)
```
app/
├── Controllers/
│   ├── ProcurementController.php
│   ├── FinanceController.php
│   ├── CatalogController.php
│   └── ... (100+ controllers)
├── Models/
│   ├── Product.php
│   ├── Order.php
│   └── ... (200+ models)
```

**Problems:**
- Hard to find related code (controllers, models, services scattered)
- Risk of breaking unrelated features
- No clear boundaries between modules

## Best Practices

### DO:
- Group by business domain (Procurement, Finance, Catalog)
- Keep domain folders independent
- Use DTOs to pass data between layers
- Follow Clean Architecture: Controller → Service → Repository

### DON'T:
- Create cross-domain dependencies
- Put business logic in controllers
- Access models directly from controllers

## References
- https://martinfowler.com/tags/domain%20driven%20design.html
- https://www.php-fig.org/psr/psr-4/
