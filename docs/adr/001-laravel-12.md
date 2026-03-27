# ADR-001: Use Laravel 12 for Backend API

## Status
Accepted

## Context
We need a robust backend framework for the Hook & Hunt ERP system with:
- REST API with modular architecture
- Queue system for background jobs
- Event-driven architecture
- Strong ecosystem and community support

## Decision
Use **Laravel 12** as the backend framework.

## Consequences

### Positive
- **Largest PHP ecosystem**: Abundant packages for any requirement
- **Built-in features**: Queues, Events, Validation, Auth out of the box
- **Easy hiring**: Largest pool of PHP/Laravel developers
- **Mature ecosystem**: Battle-tested, stable, well-documented
- **PSR-12 compliance**: Industry-standard coding practices
- **Service providers**: Easy to modularize large applications

### Negative
- **Heavier than micro-frameworks**: More overhead than Slim/Lumen
- **PHP ecosystem**: Smaller than JavaScript/Python communities
- **Learning curve**: More concepts to master (Service Providers, Facades, etc.)

## Alternatives Considered

### Node.js (Express/NestJS)
**Rejected**: Too much boilerplate for simple CRUD. TypeScript compilation adds complexity. No built-in queue/worker system.

### Python (Django/FastAPI)
**Rejected**: Slower performance. Smaller ecosystem for enterprise features. Harder to deploy on shared hosting (cPanel).

### Go (Gin/Echo)
**Rejected**: Smaller ecosystem. Harder to hire developers. No built-in ORM/queue features.

## References
- https://laravel.com/docs/12.x
- https://www.php-fig.org/psr/psr-12/
