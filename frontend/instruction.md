> Act as a senior staff engineer and refactor the entire codebase for clarity, maintainability, scalability, performance, and security.
>
> Rules:
>
> * Preserve existing behavior exactly unless a change is required to fix structural issues.
> * Treat `architecture.md` as the source of truth for architectural decisions, folder structure, boundaries, and conventions.
> * Move all business and functional logic into the appropriate `features/` directories and ensure each feature owns its relevant domain logic.
> * Establish clear separation of concerns between presentation, domain logic, data access, state management, utilities, and configuration.
> * Eliminate duplication and enforce DRY by extracting reusable logic, shared helpers, and common abstractions where appropriate.
> * Create a centralized `constants` config for shared immutable values and repeated application constants.
> * Create a centralized `routes` config for route definitions, path builders, and routing-related constants.
> * Improve naming quality across the codebase so that identifiers are explicit, consistent, and self-documenting.
> * Make the codebase more readable and maintainable by simplifying complex flows, reducing nesting, and improving file/module organization.
> * Improve performance where reasonable by removing unnecessary work, avoiding wasteful patterns, and keeping abstractions efficient.
> * Improve security by removing risky patterns, tightening boundaries, and ensuring safer defaults where applicable.
> * Standardize patterns across the project so similar problems are solved in similar ways.
> * Avoid over-engineering; prefer simple, robust, and scalable solutions.
> * Use API calls as the only mechanism for fetching or mutating application data.
> * Do not access application data directly outside the defined API layer.
> * Use `@supabase/ssr` and `@supabase/supabase-js` strictly for authentication and session management only.
> * Keep auth infrastructure isolated and do not mix authentication logic with general data-access logic.
>
> Output expectations:
>
> * Deliver a production-ready refactor with clean architecture and consistent conventions.
> * Keep the code pragmatic, senior-level, and easy for future engineers to understand and extend.
> * Favor maintainable structure and explicit design decisions over quick fixes.
>
> Before making changes, identify the current architectural issues and refactor toward a consistent target structure that can be applied across the entire project while remaining fully aligned with `architecture.md`.