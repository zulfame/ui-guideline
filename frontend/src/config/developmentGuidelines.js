import {
  Code2,
  Database,
  Layers3,
  Plug,
  ShieldCheck,
  Gauge,
  FolderTree,
  Activity,
  DatabaseBackup,
  BookOpen,
} from "lucide-react";

/**
 * Development Guidelines — data-driven content (in-app SSOT).
 * Each group has a list of topics; every topic contains:
 *  - principle: short principle statement (1–2 sentences)
 *  - rules: mandatory rules (array of strings)
 *  - dos / donts: recommended / prohibited practices
 *  - checklist: Definition-of-Done items
 *  - code (optional): { language, good, bad } correct/incorrect example
 *
 * Language: English (UI consistency). Aligned with this app's stack
 * (React + FastAPI + MongoDB) yet written to stay generic & reusable.
 * Full written document: docs/DEVELOPMENT_GUIDELINES.md
 */

export const guidelineGroups = [
  {
    id: "code",
    title: "Coding Standards",
    icon: Code2,
    summary:
      "Coding standards: structure, naming, readability, reusability, error handling, logging, configuration, and input validation.",
    topics: [
      {
        id: "code-structure",
        title: "Code Structure",
        principle:
          "Organize code by feature/domain, not by file type, so it is easy to find and change. One module = one clear responsibility.",
        rules: [
          "Use a consistent folder structure (e.g. backend: routers/services/models; frontend: pages/components/config/lib).",
          "Limit file size — split files > ~300–400 lines into smaller units.",
          "Avoid circular imports; keep dependency direction one-way.",
          "Group imports: standard library → third-party → internal.",
        ],
        dos: [
          "Group by feature (feature-first).",
          "Expose a single entry point (index/barrel) when it clarifies the module API.",
        ],
        donts: [
          "Put all logic in one giant file (God file).",
          "Mix UI, data access, and business rules in a single function.",
        ],
        checklist: [
          "Folder structure follows project conventions.",
          "No file > 400 lines without reason.",
          "No circular imports.",
        ],
      },
      {
        id: "naming-convention",
        title: "Naming Convention",
        principle:
          "Names must reveal intent (intention-revealing). A good name removes the need for a comment.",
        rules: [
          "Python: `snake_case` for variables/functions, `PascalCase` for classes, `UPPER_SNAKE` for constants.",
          "JavaScript/React: `camelCase` for variables/functions, `PascalCase` for components & types.",
          "Booleans start with `is/has/should/can` (e.g. `isActive`, `hasAccess`).",
          "Avoid ambiguous abbreviations & magic numbers — use named constants.",
        ],
        dos: [
          "Use consistent domain names across every layer.",
          "Function name = verb; variable name = noun.",
        ],
        donts: [
          "Generic names like `data`, `temp`, `handle`, `foo`.",
          "Different names for the same concept in different modules.",
        ],
        checklist: [
          "Casing convention matches the language.",
          "No magic numbers/strings.",
          "Booleans use is/has/should prefix.",
        ],
        code: {
          language: "python",
          good: "MAX_RETRY = 3\n\ndef is_office_active(office):\n    return office.get(\"status\") == \"active\"",
          bad: "def check(o):\n    if o[\"s\"] == 1:  # 1 = ?\n        return True",
        },
      },
      {
        id: "code-readability",
        title: "Code Readability",
        principle:
          "Code is read far more often than it is written. Optimize for the next reader, not for brevity.",
        rules: [
          "Short, focused functions (ideally < 30–40 lines).",
          "Limit nesting; use early return / guard clauses.",
          "Comments explain the 'why', not the 'what'.",
          "Stay consistent with the formatter (Prettier / Black) — don't format manually.",
        ],
        dos: [
          "Use early returns to reduce indentation.",
          "Name complex expressions via intermediate variables.",
        ],
        donts: [
          "Deeply nested if/else blocks.",
          "One-line expressions that are too 'clever' and hard to read.",
        ],
        checklist: [
          "Nesting at most 2–3 levels.",
          "No dead / commented-out code.",
          "Formatted by linter/formatter.",
        ],
      },
      {
        id: "code-reusability",
        title: "Code Reusability",
        principle:
          "DRY (Don't Repeat Yourself) — abstraction emerges from real duplication (rule of three), not premature speculation.",
        rules: [
          "Extract reusable utils/helpers to a shared location (e.g. `lib/`, `utils/`).",
          "Prefer composition over copy-paste duplication.",
          "Keep utils pure & side-effect free where possible.",
          "Don't over-engineer — an abstraction must pay for itself.",
        ],
        dos: [
          "Apply the 'rule of three' before abstracting.",
          "Build small, composable functions.",
        ],
        donts: [
          "Premature abstraction that adds complexity.",
          "Duplicating business logic in many places.",
        ],
        checklist: [
          "No significant logic duplication.",
          "Reusable utils live in a shared location.",
          "Abstractions have a clear justification.",
        ],
      },
      {
        id: "separation-of-concerns",
        title: "Separation of Concerns",
        principle:
          "Separate layers: presentation (UI), application (service/logic), and data (repository/access). Each layer only knows the contract of the layer below it.",
        rules: [
          "UI components never touch the database/HTTP directly — go through a service/`lib/api`.",
          "Business logic lives in the service layer, not in routers/components.",
          "Data access is isolated in one layer (repository/DAL).",
          "Configuration & secrets never leak into the presentation layer.",
        ],
        dos: [
          "Keep routers thin → delegate to services.",
          "Frontend calls the backend only via `lib/api.js`.",
        ],
        donts: [
          "Direct database queries inside a fat route handler.",
          "Placing business rules inside React components.",
        ],
        checklist: [
          "UI ↔ service ↔ data clearly separated.",
          "No direct data access from the UI.",
          "Routers stay thin.",
        ],
      },
      {
        id: "error-handling",
        title: "Error Handling",
        principle:
          "Fail fast and clearly. Return actionable errors; never silently hide failures.",
        rules: [
          "Backend: return the correct HTTP status (400/401/403/404/409/422/500) + a consistent message.",
          "Never swallow errors (empty catch) without logging/handling.",
          "Distinguish recoverable errors from fatal ones.",
          "Frontend: show feedback (toast/inline) following the design system pattern.",
        ],
        dos: [
          "Include context in errors (id, operation).",
          "Use specific error types/classes.",
        ],
        donts: [
          "Return 200 for a failed condition.",
          "Expose raw stack traces to the user.",
        ],
        checklist: [
          "Status codes match the context.",
          "No empty catch blocks.",
          "User-friendly error messages in the UI.",
        ],
        code: {
          language: "python",
          good: "office = await db.offices.find_one({\"id\": office_id})\nif not office:\n    raise HTTPException(status_code=404, detail=\"Office not found\")",
          bad: "try:\n    do_work()\nexcept Exception:\n    pass  # silently swallowed",
        },
      },
      {
        id: "exception-handling",
        title: "Exception Handling",
        principle:
          "Catch exceptions as close as possible to where they can be meaningfully handled; let the rest bubble up to a global handler.",
        rules: [
          "Catch specific exceptions, not a blanket `except Exception` (except at the global boundary).",
          "Provide a global exception handler (e.g. FastAPI handler / React ErrorBoundary).",
          "Clean up resources via `finally` / context managers.",
          "Do not use exceptions for normal control flow.",
        ],
        dos: [
          "Use `with`/context managers for resources.",
          "Log unexpected exceptions at the global boundary.",
        ],
        donts: [
          "Catch an exception only to re-throw it with no added value.",
          "Leak internal details in the response.",
        ],
        checklist: [
          "Global handler exists (backend & frontend).",
          "Exception catches are specific.",
          "Resources are cleaned up correctly.",
        ],
      },
      {
        id: "logging",
        title: "Logging",
        principle:
          "Logs are an observability tool, not a dumping ground. Use the right level and structured format.",
        rules: [
          "Use a configured logger — NEVER `print`/`console.log` in production.",
          "Correct level: DEBUG < INFO < WARNING < ERROR < CRITICAL.",
          "Never log sensitive data (passwords, tokens, PII).",
          "Include correlation context (request id / user id) when available.",
        ],
        dos: [
          "Use `logging` (Python) / a centralized logger.",
          "Structured logs (key-value) for easy searching.",
        ],
        donts: [
          "Log full payloads containing secrets.",
          "Spam high-volume INFO logs for routine events.",
        ],
        checklist: [
          "No `print`/`console.log` (checked by design-guard).",
          "No secrets in logs.",
          "Log levels match context.",
        ],
      },
      {
        id: "configuration-management",
        title: "Configuration Management",
        principle:
          "Configuration is separate from code (12-factor). Values that differ per environment come from environment variables, not hardcoding.",
        rules: [
          "Read configuration from the environment (`os.environ` / `process.env`).",
          "NEVER hardcode URLs, ports, credentials, or database names.",
          "Backend uses `MONGO_URL`; frontend uses `REACT_APP_BACKEND_URL`.",
          "Provide safe defaults & validate required variables at startup.",
        ],
        dos: [
          "Store secrets in `.env` (not committed).",
          "Document every required variable.",
        ],
        donts: [
          "Put secrets directly in source code.",
          "Write URLs/ports literally in code.",
        ],
        checklist: [
          "No hardcoded URL/port/secret values.",
          "Required variables validated at startup.",
          "`.env` is not in version control.",
        ],
      },
      {
        id: "input-validation",
        title: "Input Validation",
        principle:
          "Trust no input. Validate at the system boundary before processing. Client validation is for UX; server validation is for security.",
        rules: [
          "Use schema-based validation: Pydantic (backend), Zod (frontend).",
          "Validate type, range, length, format, and enum.",
          "Server-side validation is mandatory — client validation only complements it.",
          "Return specific, actionable validation messages (422).",
        ],
        dos: [
          "Define a model/schema for every payload.",
          "Whitelist allowed values, not blacklist.",
        ],
        donts: [
          "Rely on frontend validation only.",
          "Accept unknown fields without control.",
        ],
        checklist: [
          "Every endpoint has a request schema.",
          "Frontend forms have validation (Zod).",
          "Validation errors are clear & consistent.",
        ],
        code: {
          language: "python",
          good: "class OfficeCreate(BaseModel):\n    code: str = Field(min_length=1, max_length=20)\n    name: str = Field(min_length=1)\n    radius: int = Field(gt=0)",
          bad: "def create(payload: dict):\n    code = payload[\"code\"]  # no validation",
        },
      },
    ],
  },

  {
    id: "database",
    title: "Schema Database",
    icon: Database,
    summary:
      "Schema design, table/collection structure, column naming, data types, primary/foreign keys, indexes, constraints, normalization, and audit fields.",
    topics: [
      {
        id: "schema-design",
        title: "Database Schema Design",
        principle:
          "The schema reflects the domain clearly and evolves in a controlled way. This app uses MongoDB — design around access patterns, but relational principles still apply.",
        rules: [
          "Design the schema around real query/access patterns.",
          "Use UUID (string) as the identity — do NOT expose Mongo ObjectId.",
          "Stay consistent across collections (uniform document shape per entity).",
          "Manage schema changes via documented migrations/versions.",
        ],
        dos: [
          "Embed data always read together; reference when independent.",
          "Store timestamps in UTC (ISO 8601).",
        ],
        donts: [
          "Inconsistent document shape across records.",
          "Exposing `_id`/ObjectId to the API.",
        ],
        checklist: [
          "Identity uses a UUID string.",
          "Document shape is consistent.",
          "Schema changes are documented.",
        ],
      },
      {
        id: "table-structure",
        title: "Table / Collection Structure",
        principle:
          "One table/collection represents one cohesive domain entity. Avoid catch-all columns whose meaning shifts.",
        rules: [
          "One collection = one concept (offices, roles, levels).",
          "Avoid ambiguous 'catch-all' fields.",
          "Separate high-frequency volatile data from stable reference data.",
          "Limit document nesting depth so it stays easy to query.",
        ],
        dos: [
          "Design documents around read/write units.",
          "Use a limited enum/status set for state.",
        ],
        donts: [
          "Storing many different entities in one collection.",
          "Nesting too deep (> 3–4 levels).",
        ],
        checklist: [
          "Collections are cohesive per entity.",
          "No catch-all fields.",
          "Reasonable nesting.",
        ],
      },
      {
        id: "column-naming",
        title: "Column / Field Naming",
        principle:
          "Field names are consistent, descriptive, and uniform across collections for the same concept.",
        rules: [
          "Use consistent `snake_case` for fields.",
          "Same name for the same concept (e.g. `created_at` in all collections).",
          "Booleans start with `is_/has_`.",
          "Foreign references get an `_id` suffix (e.g. `parent_id`, `level_id`).",
        ],
        dos: [
          "Standardize audit names (`created_at`, `updated_at`).",
          "Use standardized domain terms.",
        ],
        donts: [
          "Mixing `camelCase` & `snake_case` in the database.",
          "Unclear abbreviations (`cd`, `nm`).",
        ],
        checklist: [
          "Field casing is consistent.",
          "References use the `_id` suffix.",
          "Audit names are uniform.",
        ],
      },
      {
        id: "data-type-selection",
        title: "Data Type Selection",
        principle:
          "Pick the most precise & strictest type for the data — accurate, efficient, and corruption-resistant.",
        rules: [
          "Store time as UTC datetime (not free-form strings).",
          "Numbers as numbers (int/float as needed), not strings.",
          "Monetary values: avoid float; use smallest integer unit (e.g. cents) or Decimal.",
          "Use enums/limited sets for status/categories.",
        ],
        dos: [
          "Normalize date formats to ISO 8601.",
          "Validate numeric ranges (lat/long/radius).",
        ],
        donts: [
          "Storing numbers/booleans as strings.",
          "Using float for money.",
        ],
        checklist: [
          "Data types match meaning.",
          "Time in UTC.",
          "No float for money.",
        ],
      },
      {
        id: "primary-key-strategy",
        title: "Primary Key Strategy",
        principle:
          "Primary keys are stable, unique, and carry no business meaning. UUID is this app's default.",
        rules: [
          "Use UUID v4 (string) as the primary key `id`.",
          "Do NOT use Mongo ObjectId as a public identity (not JSON-serializable & leaks info).",
          "Keys are immutable once created.",
          "Never use a business key (email/code) as the primary key.",
        ],
        dos: [
          "Generate the UUID in the application on create.",
          "Index the `id` field for fast lookup.",
        ],
        donts: [
          "Exposing ObjectId to the frontend.",
          "Changing a primary key value.",
        ],
        checklist: [
          "Primary key = UUID string.",
          "No ObjectId in the API.",
          "Keys are immutable.",
        ],
      },
      {
        id: "foreign-key-relationship",
        title: "Foreign Key Relationship",
        principle:
          "Relationships between entities are explicit and their integrity is enforced by the application (MongoDB does not enforce FKs).",
        rules: [
          "Store references as `<entity>_id` (UUID).",
          "Validate reference existence before saving (e.g. `level_id` must exist).",
          "Handle deletion per domain: restrict (block) / cascade / set-null / promote children.",
          "For master data, restrict deletion while dependents exist (return 409).",
          "Prevent invalid relationships (self-reference, cycles).",
        ],
        dos: [
          "Validate FKs in the service layer.",
          "Block deletion of records still referenced by dependents (409).",
          "Clean up dangling references on delete.",
        ],
        donts: [
          "Storing references without validation.",
          "Leaving dangling references after delete.",
          "Deleting a parent/master record while children still point to it.",
        ],
        checklist: [
          "References validated on write.",
          "Delete policy is clear.",
          "Anti-cycle for hierarchical relationships.",
        ],
      },
      {
        id: "index-management",
        title: "Index Management",
        principle:
          "Indexes speed up reads at the cost of writes & storage. Create indexes based on real query patterns.",
        rules: [
          "Index fields frequently filtered/sorted/joined.",
          "Create unique indexes for unique fields (e.g. `code`, `name`).",
          "Use compound indexes matching the query order.",
          "Monitor & drop unused indexes.",
        ],
        dos: [
          "Define unique indexes at startup.",
          "Verify the query plan for heavy operations.",
        ],
        donts: [
          "Over-indexing that slows writes.",
          "Relying on full-collection scans.",
        ],
        checklist: [
          "Unique fields have unique indexes.",
          "Hot queries are indexed.",
          "No wasted indexes.",
        ],
      },
      {
        id: "constraint-management",
        title: "Constraint Management",
        principle:
          "Constraints keep data always valid. Since MongoDB has minimal built-in constraints, the application must enforce them.",
        rules: [
          "Enforce uniqueness in two layers: unique index + application check (409 on conflict).",
          "Require required fields via schema (Pydantic).",
          "Validate ranges & formats before saving.",
          "Preserve domain invariants (e.g. only one direct superior).",
        ],
        dos: [
          "Return 409 for uniqueness violations.",
          "Validate fully before persisting.",
        ],
        donts: [
          "Relying on the database alone for all rules.",
          "Letting inconsistent state be saved.",
        ],
        checklist: [
          "Uniqueness enforced by index + application.",
          "Required fields validated.",
          "Domain invariants preserved.",
        ],
      },
      {
        id: "database-normalization",
        title: "Database Normalization",
        principle:
          "Normalization reduces duplication & anomalies; measured denormalization is allowed for read performance. In document DBs, the embed vs reference balance is key.",
        rules: [
          "Reference for data used by many entities & frequently changing.",
          "Embed for data always read together with its parent.",
          "Denormalize only when proven necessary & keep it consistent.",
          "Avoid duplicating the source of truth (single source of truth).",
        ],
        dos: [
          "Document the reason for denormalization.",
          "Sync denormalized copies on update.",
        ],
        donts: [
          "Copying changing data to many places without syncing.",
          "Embedding large, rarely-used data.",
        ],
        checklist: [
          "Embed vs reference decisions are justified.",
          "Denormalization is documented.",
          "No risky SSOT duplication.",
        ],
      },
      {
        id: "audit-fields",
        title: "Audit Fields",
        principle:
          "Every entity tracks a minimal change trail: when created & updated, ideally by whom.",
        rules: [
          "Require `created_at` & `updated_at` (UTC) in every collection.",
          "Set `created_at` once; update `updated_at` on every change.",
          "Add `created_by`/`updated_by` when a user context exists.",
          "Consider soft delete (`deleted_at`) for important data.",
        ],
        dos: [
          "Populate audit fields automatically in the service layer.",
          "Use server time (UTC), not client time.",
        ],
        donts: [
          "Permanently deleting the audit trail of critical data without a policy.",
          "Relying on the client for timestamps.",
        ],
        checklist: [
          "`created_at`/`updated_at` exist & are UTC.",
          "`updated_at` refreshed on write.",
          "Delete/soft-delete policy is clear.",
        ],
      },
    ],
  },

  {
    id: "data-access",
    title: "Data Access",
    icon: Layers3,
    summary:
      "Query optimization, pagination, batch processing, transaction management, and data consistency.",
    topics: [
      {
        id: "query-optimization",
        title: "Query Optimization",
        principle:
          "Fetch only what you need. Efficient queries use indexes, projection, and precise filters.",
        rules: [
          "Filter in the database, not in the application.",
          "Project only the fields you need.",
          "Avoid N+1 queries — batch/aggregate when necessary.",
          "Leverage indexes (see Index Management).",
        ],
        dos: [
          "Use aggregation pipelines for heavy transforms.",
          "Measure slow queries & fix them.",
        ],
        donts: [
          "Pulling the whole collection then filtering in memory.",
          "Repeated queries inside a loop (N+1).",
        ],
        checklist: [
          "Filtering & projection in the DB.",
          "No N+1.",
          "Hot queries are indexed.",
        ],
      },
      {
        id: "data-pagination",
        title: "Data Pagination",
        principle:
          "Never return an unbounded list. Pagination protects the backend, the network, and the UI.",
        rules: [
          "Paginate list endpoints (limit + skip / cursor).",
          "Set a maximum page size.",
          "Return metadata (total, page, page_size) when the UI needs it.",
          "Cursor/keyset pagination for very large datasets.",
        ],
        dos: [
          "Reasonable default page size (e.g. 10–50).",
          "Keep the pagination contract consistent across endpoints.",
        ],
        donts: [
          "Returning thousands of records with no limit.",
          "Deep offset pagination on huge data.",
        ],
        checklist: [
          "List endpoints are paginated.",
          "A maximum exists.",
          "Pagination contract is consistent.",
        ],
      },
      {
        id: "batch-processing",
        title: "Batch Processing",
        principle:
          "Bulk operations run in batches for efficiency & resilience, not one at a time.",
        rules: [
          "Use bulk operations for mass insert/update/delete.",
          "Process in reasonably sized chunks to bound memory.",
          "Provide partial-failure handling (report failed items).",
          "Idempotency so retries are safe.",
        ],
        dos: [
          "Use bulk write / `insert_many`.",
          "Chunk large data (e.g. 500–1000 per batch).",
        ],
        donts: [
          "Looping a query per item for mass operations.",
          "Loading the entire dataset into memory at once.",
        ],
        checklist: [
          "Mass operations use bulk.",
          "Chunking exists.",
          "Partial failures handled.",
        ],
      },
      {
        id: "transaction-management",
        title: "Transaction Management",
        principle:
          "Operations that must be atomic are wrapped in a transaction — all succeed or all roll back.",
        rules: [
          "Use transactions for multi-document changes that must be atomic.",
          "Keep transactions short to reduce contention.",
          "Handle rollback on failure.",
          "For cross-system actions, use the saga/compensation pattern.",
        ],
        dos: [
          "Wrap related steps in a single transaction.",
          "Test the rollback path.",
        ],
        donts: [
          "Long-running transactions holding locks.",
          "Assuming multi-writes are consistent without a transaction.",
        ],
        checklist: [
          "Atomic changes use transactions.",
          "Rollback tested.",
          "Transactions are short.",
        ],
      },
      {
        id: "data-consistency",
        title: "Data Consistency",
        principle:
          "Preserve data integrity & consistency across operations; understand the strong vs eventual consistency trade-off.",
        rules: [
          "Enforce domain invariants in the service layer.",
          "Prevent race conditions (e.g. check-then-write) with atomic operations.",
          "Sync denormalized data when the source changes.",
          "Re-validate on the server before commit.",
        ],
        dos: [
          "Use atomic updates (`find_one_and_update`).",
          "Define invariants & keep them in one place.",
        ],
        donts: [
          "Letting competing writes corrupt state.",
          "Relying on client operation order.",
        ],
        checklist: [
          "Invariants preserved on the server.",
          "Race conditions mitigated.",
          "Denormalized data stays in sync.",
        ],
      },
    ],
  },


  {
    id: "security",
    title: "Security Management",
    icon: ShieldCheck,
    summary:
      "Secure data validation, sensitive data protection, credential management, file security, session management, security headers, and input & output sanitization.",
    topics: [
      {
        id: "secure-data-validation",
        title: "Secure Data Validation",
        principle:
          "Security-oriented validation: assume all input is hostile, whitelist what is allowed, reject the rest.",
        rules: [
          "Whitelist allowed formats/values (not blacklist).",
          "Re-validate on the server even if the client already validated.",
          "Limit payload size & type.",
          "Prevent injection (NoSQL/command) via parameterized queries/schemas.",
        ],
        dos: [
          "Use strict schemas (Pydantic/Zod).",
          "Reject input that doesn't match the pattern.",
        ],
        donts: [
          "Building queries from raw input strings.",
          "Relying on client validation only.",
        ],
        checklist: [
          "Whitelisting applied.",
          "Server validation mandatory.",
          "Anti-injection applied.",
        ],
      },
      {
        id: "sensitive-data-protection",
        title: "Sensitive Data Protection",
        principle:
          "Protect sensitive data/PII throughout its lifecycle: in transit, at rest, and on display.",
        rules: [
          "Encrypt in-transit (HTTPS/TLS) — mandatory.",
          "Encrypt/protect sensitive data at-rest when needed.",
          "Do not log/return sensitive data.",
          "Apply masking on display (e.g. partial numbers).",
        ],
        dos: [
          "Minimize collection of sensitive data.",
          "Mask data on display.",
        ],
        donts: [
          "Storing PII without need.",
          "Sending sensitive data in URLs/query strings.",
        ],
        checklist: [
          "TLS active.",
          "No sensitive data in logs/responses.",
          "Masking in the UI.",
        ],
      },
      {
        id: "credential-management",
        title: "Credential Management",
        principle:
          "Secrets never enter source code or version control. Manage them via environment/secret manager.",
        rules: [
          "All secrets (API keys, DB URL, tokens) in `.env`/a secret manager.",
          "Do NOT commit `.env` or hardcode secrets.",
          "Rotate keys periodically & on leak.",
          "Scope keys narrowly (least privilege).",
        ],
        dos: [
          "Use environment variables.",
          "Keep `.env` in `.gitignore`.",
        ],
        donts: [
          "Placing keys in the repo/code/logs.",
          "Sharing one super-access key with everyone.",
        ],
        checklist: [
          "No secrets in code/repo.",
          "`.env` not committed.",
          "A rotation policy exists.",
        ],
      },
      {
        id: "integration-secret-handling",
        title: "Integration Secret Handling",
        principle:
          "User-supplied integration secrets (bot tokens, webhook URLs, SMTP passwords) are write-only from the client's perspective.",
        rules: [
          "Never return stored secrets to the client — send an empty value plus a boolean `*_set` flag.",
          "On update, treat an empty secret field as 'keep existing' (merge) so the client never resends it.",
          "Redact secret keys in audit logs (extend the shared redaction set).",
          "When testing a connection, prefer validation-only calls (e.g. Telegram getMe, SMTP login) over sending real messages where possible.",
        ],
        dos: [
          "Mask secrets on read; persist only on explicit change.",
          "Keep one redaction list shared by the audit layer.",
        ],
        donts: [
          "Echoing tokens/passwords back in GET responses.",
          "Logging raw credentials in audit `request`/`metadata`.",
        ],
        checklist: [
          "GET never exposes a stored secret.",
          "Empty secret on save preserves the old value.",
          "Audit entries show secrets as redacted.",
        ],
      },
      {
        id: "file-security",
        title: "File Security",
        principle:
          "File upload & access are common attack vectors. Validate strictly and store safely.",
        rules: [
          "Validate type (MIME + extension) and maximum size.",
          "Store outside the webroot or in dedicated storage; sanitize file names.",
          "Never execute an uploaded file.",
          "Control download access (authorization + signed URLs when needed).",
        ],
        dos: [
          "Use chunked upload for large files.",
          "Generate a new file name (e.g. UUID) on save.",
        ],
        donts: [
          "Trusting the client-provided file name/type.",
          "Serving the upload directory publicly without control.",
        ],
        checklist: [
          "Type & size validated.",
          "File names sanitized.",
          "Download access authorized.",
        ],
      },
      {
        id: "session-management",
        title: "Session Management",
        principle:
          "Sessions/tokens are managed securely: short-lived, revocable, and protected from theft.",
        rules: [
          "Session cookies: `HttpOnly`, `Secure`, `SameSite`.",
          "Sessions/tokens have an expiry & idle timeout.",
          "Regenerate session id after login (prevent fixation).",
          "Provide a logout that truly revokes the session.",
        ],
        dos: [
          "Store tokens in secure storage.",
          "Revoke tokens on logout/credential change.",
        ],
        donts: [
          "Sessions that never expire.",
          "Storing sensitive tokens in localStorage without consideration.",
        ],
        checklist: [
          "Cookies HttpOnly/Secure/SameSite.",
          "Timeout & revocation exist.",
          "Session id regenerated on login.",
        ],
      },
      {
        id: "security-headers",
        title: "Security Headers",
        principle:
          "HTTP security headers add an extra defense layer against common attacks.",
        rules: [
          "Apply HSTS to force HTTPS.",
          "Set `X-Content-Type-Options: nosniff` & `X-Frame-Options`/frame-ancestors.",
          "Apply a Content Security Policy (CSP) as needed.",
          "Configure CORS strictly (specific allowed origins).",
        ],
        dos: [
          "Enable security headers at the server/proxy layer.",
          "Restrict CORS to known origins.",
        ],
        donts: [
          "CORS `*` for sensitive endpoints.",
          "Ignoring CSP entirely.",
        ],
        checklist: [
          "HSTS & nosniff active.",
          "CSP configured.",
          "Strict CORS.",
        ],
      },
      {
        id: "input-output-sanitization",
        title: "Input & Output Sanitization",
        principle:
          "Input sanitization prevents injection; output encoding prevents XSS. Both are mandatory.",
        rules: [
          "Escape/encode output per context (HTML/attr/URL/JS).",
          "React escapes text by default — avoid `dangerouslySetInnerHTML`.",
          "Sanitize HTML from untrusted sources if it must be rendered.",
          "Use parameterized queries/schemas to prevent injection.",
        ],
        dos: [
          "Rely on the framework's default escaping.",
          "Sanitize HTML with a trusted library when necessary.",
        ],
        donts: [
          "`dangerouslySetInnerHTML` from user input.",
          "Concatenating input into queries/commands.",
        ],
        checklist: [
          "Output encoded per context.",
          "No raw HTML from users.",
          "Anti-injection applied.",
        ],
      },
    ],
  },

  {
    id: "performance",
    title: "Performance",
    icon: Gauge,
    summary:
      "Caching strategy, resource optimization, background processing, lazy loading, and performance monitoring.",
    topics: [
      {
        id: "caching-strategy",
        title: "Caching Strategy",
        principle:
          "Caching reduces repeated work but adds invalidation complexity. Cache with clear targeting & an explicit expiry policy.",
        rules: [
          "Cache expensive & frequently-read data with an appropriate TTL.",
          "Define an invalidation strategy when data changes.",
          "Use layered caches (client/CDN/server) as needed.",
          "Avoid caching sensitive/per-user data in a shared layer.",
        ],
        dos: [
          "Define a clear TTL & cache key.",
          "Invalidate on related writes.",
        ],
        donts: [
          "Caching without an invalidation strategy.",
          "Serving stale, misleading data.",
        ],
        checklist: [
          "TTL & key defined.",
          "Invalidation is clear.",
          "No sensitive data cached in the wrong place.",
        ],
      },
      {
        id: "resource-optimization",
        title: "Resource Optimization",
        principle:
          "Save CPU, memory, network, and bundle size. Speed is a feature.",
        rules: [
          "Frontend: code splitting, minification, asset & image compression.",
          "Backend: avoid unnecessary work/allocation on the hot path.",
          "Reduce payload size (field projection, pagination).",
          "Use efficient connections/pools.",
        ],
        dos: [
          "Optimize image size & format.",
          "Monitor frontend bundle size.",
        ],
        donts: [
          "Sending large, unnecessary payloads.",
          "Loading all code up front.",
        ],
        checklist: [
          "Assets optimized.",
          "Payloads minimal.",
          "Bundle monitored.",
        ],
      },
      {
        id: "background-processing",
        title: "Background Processing",
        principle:
          "Heavy/slow work runs asynchronously in the background so requests stay responsive.",
        rules: [
          "Move long tasks (email, reports, data processing) to a background/queue.",
          "Make tasks idempotent & retryable.",
          "Give the user task-status visibility when needed.",
          "Limit concurrency so resources aren't overwhelmed.",
        ],
        dos: [
          "Use a task queue / worker.",
          "Report progress for long tasks.",
        ],
        donts: [
          "Blocking an HTTP request for heavy work.",
          "Background tasks without failure handling.",
        ],
        checklist: [
          "Heavy work in the background.",
          "Idempotent & retryable.",
          "Concurrency limited.",
        ],
      },
      {
        id: "lazy-loading",
        title: "Lazy Loading",
        principle:
          "Load resources only when needed to speed up initial load time.",
        rules: [
          "Frontend: lazy-load heavy routes/components (code splitting).",
          "Lazy-load images & below-the-fold content.",
          "Backend: load relations/data only when required.",
          "Virtualize very long lists/tables.",
        ],
        dos: [
          "Use dynamic import for large pages.",
          "Virtualize large tables.",
        ],
        donts: [
          "Loading the whole dataset into the UI at once.",
          "Eager-loading all modules up front.",
        ],
        checklist: [
          "Heavy routes split.",
          "Images lazy-loaded.",
          "Long lists virtualized.",
        ],
      },
      {
        id: "performance-monitoring",
        title: "Performance Monitoring",
        principle:
          "You can't optimize what you don't measure. Monitor performance metrics continuously.",
        rules: [
          "Track latency (p50/p95/p99) of critical endpoints.",
          "Monitor throughput, error rate, and resources (CPU/mem).",
          "Frontend: monitor Core Web Vitals (LCP/CLS/INP).",
          "Set a baseline & alert on regressions.",
        ],
        dos: [
          "Measure before & after optimization.",
          "Set threshold alerts.",
        ],
        donts: [
          "Optimizing without data (guesswork).",
          "Ignoring performance regressions.",
        ],
        checklist: [
          "Latency p95/p99 monitored.",
          "Core Web Vitals monitored.",
          "Baseline & alerts exist.",
        ],
      },
    ],
  },

  {
    id: "file-management",
    title: "File Management",
    icon: FolderTree,
    summary:
      "File organization, naming, validation, and managed retention/cleanup.",
    topics: [
      {
        id: "file-organization",
        title: "File Organization",
        principle:
          "Files are stored in a structured, predictable way, separated from application code, in persistent storage.",
        rules: [
          "Use a meaningful directory structure (e.g. by date/entity).",
          "Store in dedicated persistent storage, not mixed with source.",
          "Store file metadata (owner, size, type, time) in the database.",
          "Separate public vs private files.",
        ],
        dos: [
          "Reference files via DB metadata.",
          "Use storage that survives restarts.",
        ],
        donts: [
          "Placing uploads inside the code/webroot folder.",
          "Losing track of file metadata.",
        ],
        checklist: [
          "Directory structure is clear.",
          "Metadata stored in the DB.",
          "Public/private separated.",
        ],
      },
      {
        id: "file-naming",
        title: "File Naming",
        principle:
          "File names are safe, unique, and not dependent on raw user input.",
        rules: [
          "Generate a unique name (e.g. UUID) on storage.",
          "Sanitize the original name; keep it as separate metadata.",
          "Prevent path traversal (`../`) & dangerous characters.",
          "Store the extension only after type validation.",
        ],
        dos: [
          "Use a UUID for the physical name.",
          "Store `original_name` in metadata.",
        ],
        donts: [
          "Using the user's file name as-is.",
          "Allowing path characters in the name.",
        ],
        checklist: [
          "Physical name unique/safe.",
          "Path traversal prevented.",
          "Original name as metadata.",
        ],
      },
      {
        id: "file-validation",
        title: "File Validation",
        principle:
          "Validate files before accepting them: type, size, and content, to prevent abuse & malware.",
        rules: [
          "Limit maximum size & allowed types (whitelist).",
          "Verify MIME/magic bytes, not just the extension.",
          "Reject dangerous/executable files.",
          "Scan for malware when the context demands it.",
        ],
        dos: [
          "Whitelist file types.",
          "Check magic bytes.",
        ],
        donts: [
          "Trusting the client's extension/`Content-Type`.",
          "Accepting files with no size limit.",
        ],
        checklist: [
          "Type & size validated.",
          "Magic bytes checked.",
          "Dangerous files rejected.",
        ],
      },
      {
        id: "file-retention",
        title: "File Retention",
        principle:
          "Files have a lifecycle: keep them as long as needed, clean up the unused per policy.",
        rules: [
          "Define a retention policy & storage period.",
          "Clean up orphan files (no longer referenced).",
          "Consider soft-delete + scheduled purge for important files.",
          "Comply with data-retention regulations where applicable.",
        ],
        dos: [
          "Schedule orphan cleanup.",
          "Document the retention policy.",
        ],
        donts: [
          "Keeping files forever with no policy.",
          "Permanently deleting without a trail/approval.",
        ],
        checklist: [
          "A retention policy exists.",
          "Orphan files cleaned up.",
          "Regulatory compliance met.",
        ],
      },
    ],
  },

  {
    id: "monitoring",
    title: "Monitoring",
    icon: Activity,
    summary:
      "Application logging, audit logging, error monitoring, health monitoring, and performance metrics.",
    topics: [
      {
        id: "application-logging",
        title: "Application Logging",
        principle:
          "Application logs give visibility into system behavior. Structured, leveled, and safe.",
        rules: [
          "Use structured logging (key-value/JSON) with levels.",
          "Include correlation context (request id).",
          "Do not log secrets/PII (see Logging & Sensitive Data).",
          "Manage log volume & rotation.",
        ],
        dos: [
          "Standardize the log format.",
          "Correlate logs across services.",
        ],
        donts: [
          "`print`/`console.log` as production logging.",
          "Unstructured logs that are hard to search.",
        ],
        checklist: [
          "Logs structured & leveled.",
          "A request id exists.",
          "No secrets in logs.",
        ],
      },
      {
        id: "audit-logging",
        title: "Audit Logging",
        principle:
          "Audit logs record who did what & when to important data/actions — for accountability & forensics.",
        rules: [
          "Record sensitive actions (create/update/delete, login, permission changes).",
          "Include actor, action, target, time (UTC), and result.",
          "Audit logs are append-only & protected.",
          "Store per retention/compliance policy.",
        ],
        dos: [
          "Separate audit logs from ordinary application logs.",
          "Make them immutable/append-only.",
        ],
        donts: [
          "Allowing deletion/modification of audit logs.",
          "Missing critical actions from the audit.",
        ],
        checklist: [
          "Sensitive actions are audited.",
          "Contains actor/action/target/time.",
          "Append-only & clear retention.",
        ],
      },
      {
        id: "error-monitoring",
        title: "Error Monitoring",
        principle:
          "Errors are captured, aggregated, and acted upon — not just printed and lost.",
        rules: [
          "Collect errors centrally (e.g. Sentry) with stack & context.",
          "Aggregate & deduplicate to find patterns.",
          "Alert on critical errors/spikes.",
          "Associate errors with release/version.",
        ],
        dos: [
          "Capture backend & frontend errors.",
          "Triage & prioritize.",
        ],
        donts: [
          "Letting errors drown in logs.",
          "Alert fatigue (too much noise).",
        ],
        checklist: [
          "Errors collected centrally.",
          "Critical alerts exist.",
          "Tied to release version.",
        ],
      },
      {
        id: "health-monitoring",
        title: "Health Monitoring",
        principle:
          "The system exposes its health so orchestrators & the team know status in real time.",
        rules: [
          "Provide health/readiness endpoints (e.g. `/api/health`).",
          "Check vital dependencies (database, external services).",
          "Distinguish liveness vs readiness.",
          "Alert when health fails.",
        ],
        dos: [
          "Keep health checks light & fast.",
          "Check the DB connection on readiness.",
        ],
        donts: [
          "A health check that always returns 200 with no real check.",
          "Ignoring dependency status.",
        ],
        checklist: [
          "Health/readiness endpoint exists.",
          "Vital dependencies checked.",
          "Alerts on failure.",
        ],
      },
      {
        id: "performance-metrics",
        title: "Performance Metrics",
        principle:
          "Quantitative metrics (RED/USE) guide capacity & optimization decisions.",
        rules: [
          "Track Rate, Errors, Duration (RED) for services.",
          "Track Utilization, Saturation, Errors (USE) for resources.",
          "Expose metrics in a standard format (e.g. Prometheus).",
          "Visualize on a dashboard & set SLOs.",
        ],
        dos: [
          "Define SLIs/SLOs.",
          "Dashboard the key metrics.",
        ],
        donts: [
          "Collecting metrics that are never used.",
          "Having no targets (SLOs).",
        ],
        checklist: [
          "RED/USE metrics available.",
          "Dashboard & SLOs exist.",
          "Metrics in a standard format.",
        ],
      },
    ],
  },

  {
    id: "backup-recovery",
    title: "Backup & Recovery",
    icon: DatabaseBackup,
    summary:
      "Data backup strategy, recovery procedures, and backup verification.",
    topics: [
      {
        id: "data-backup",
        title: "Data Backup",
        principle:
          "Backups protect against data loss. Follow the 3-2-1 rule and automate.",
        rules: [
          "Apply 3-2-1 (3 copies, 2 media, 1 off-site).",
          "Scheduled & automated backups (full + incremental).",
          "Encrypt backups, especially off-site ones.",
          "Set an RPO (how much data may be lost).",
        ],
        dos: [
          "Automate the backup schedule.",
          "Encrypt & store off-site.",
        ],
        donts: [
          "Occasional manual backups with no schedule.",
          "Keeping backups in only one place.",
        ],
        checklist: [
          "Backups automated & scheduled.",
          "Encrypted & off-site.",
          "RPO defined.",
        ],
      },
      {
        id: "recovery-procedure",
        title: "Recovery Procedure",
        principle:
          "Backups are useless without tested recovery. The restore procedure must be clear & rehearsed.",
        rules: [
          "Document step-by-step restore (runbook).",
          "Set an RTO (recovery time target).",
          "Run recovery drills periodically.",
          "Define roles & escalation during an incident.",
        ],
        dos: [
          "Keep an easily accessible runbook.",
          "Train the team to perform a restore.",
        ],
        donts: [
          "Assuming a restore will surely succeed.",
          "A procedure that lives only in one person's head.",
        ],
        checklist: [
          "Restore runbook exists.",
          "RTO defined.",
          "Drills done periodically.",
        ],
      },
      {
        id: "backup-verification",
        title: "Backup Verification",
        principle:
          "An unverified backup = no backup. Test integrity & recoverability regularly.",
        rules: [
          "Verify backup integrity (checksum) after creation.",
          "Perform periodic test-restores to a separate environment.",
          "Monitor backup job success/failure + alert.",
          "Record verification results.",
        ],
        dos: [
          "Schedule test-restores.",
          "Alert on backup failure.",
        ],
        donts: [
          "Assuming a job succeeded without checking contents.",
          "Never attempting a restore.",
        ],
        checklist: [
          "Integrity verified.",
          "Regular test-restores.",
          "Failures alerted.",
        ],
      },
    ],
  },

  {
    id: "documentation",
    title: "Documentation",
    icon: BookOpen,
    summary:
      "Living, maintained documentation for architecture, database, API, and changes (changelog).",
    topics: [
      {
        id: "architecture-documentation",
        title: "Architecture Documentation",
        principle:
          "Architecture docs explain components, flows, and key decisions so the team gets up to speed quickly & stays aligned.",
        rules: [
          "Maintain `ARCHITECTURE.md` (components, data flow, integrations).",
          "Include high-level diagrams when helpful.",
          "Record important decisions (ADRs) with their reasoning.",
          "Update when the architecture changes.",
        ],
        dos: [
          "Document the 'why', not just the 'what'.",
          "Link to related SSOTs.",
        ],
        donts: [
          "Letting docs go stale.",
          "Keeping knowledge only verbal.",
        ],
        checklist: [
          "`ARCHITECTURE.md` maintained.",
          "Decisions recorded (ADRs).",
          "Updated on change.",
        ],
      },
      {
        id: "database-documentation",
        title: "Database Documentation",
        principle:
          "The data structure is documented: collections, fields, types, relationships, indexes, and constraints.",
        rules: [
          "Document every collection & field (type, required, meaning).",
          "Explain relationships & delete policies.",
          "Record indexes & constraints (unique).",
          "Keep it aligned with the implementation (single source).",
        ],
        dos: [
          "Include sample documents.",
          "Update when the schema changes.",
        ],
        donts: [
          "Schema docs that differ from reality.",
          "Skipping indexes/constraints.",
        ],
        checklist: [
          "Collections & fields documented.",
          "Relationships & indexes explained.",
          "Aligned with the implementation.",
        ],
      },
      {
        id: "api-documentation",
        title: "API Documentation",
        principle:
          "APIs are clearly documented: endpoints, parameters, request/response, errors, and authentication.",
        rules: [
          "Leverage automatic OpenAPI/Swagger (FastAPI `/docs`).",
          "Describe each endpoint, parameter, & error code.",
          "Include request/response examples.",
          "Update alongside code changes (living docs).",
        ],
        dos: [
          "Use models & docstrings to enrich OpenAPI.",
          "Document the error schema.",
        ],
        donts: [
          "Endpoints with no description/examples.",
          "API docs lagging behind the code.",
        ],
        checklist: [
          "OpenAPI available & accurate.",
          "Examples & errors documented.",
          "In sync with the code.",
        ],
      },
      {
        id: "change-documentation",
        title: "Change Documentation",
        principle:
          "Changes are recorded cleanly (changelog + commit + PR) so history & impact are traceable.",
        rules: [
          "Maintain a CHANGELOG following SemVer & 'Keep a Changelog'.",
          "Descriptive commit messages (e.g. Conventional Commits).",
          "PRs explain context, changes, & impact.",
          "Flag breaking changes & migrations.",
        ],
        dos: [
          "Group changes (Added/Changed/Fixed/Removed).",
          "Reference related issues/tickets.",
        ],
        donts: [
          "'update' commits with no context.",
          "Breaking changes with no notes.",
        ],
        checklist: [
          "CHANGELOG maintained.",
          "Descriptive commits/PRs.",
          "Breaking changes flagged.",
        ],
      },
    ],
  },
  {
    id: "api",
    title: "API Engineering",
    icon: Plug,
    summary:
      "Standards for building HTTP APIs — including client-facing/integration APIs: idempotency, validation, standardized responses & errors, authz, rate limiting, timeouts/retries, correlation IDs, logging, transactional consistency, payload integrity, monitoring, versioning, and backward compatibility.",
    topics: [
      {
        id: "api-idempotency",
        title: "Idempotency Implementation",
        principle:
          "Unsafe operations (POST/create, payments, side effects) must be safely repeatable: the same request produces the same result exactly once.",
        rules: [
          "Accept an `Idempotency-Key` header on non-idempotent endpoints; persist the key + first response.",
          "Return the stored response on replay instead of re-executing the side effect.",
          "Make PUT/DELETE naturally idempotent (same input → same end state).",
          "Scope idempotency keys per client/user and expire them after a bounded window.",
        ],
        dos: [
          "Use a unique DB constraint (or upsert) as the final idempotency guard.",
          "Document the idempotency window and key format.",
        ],
        donts: [
          "Rely on the client never retrying.",
          "Generate side effects (emails, charges) before the idempotency check.",
        ],
        checklist: [
          "Create/charge endpoints accept Idempotency-Key.",
          "Replays return the original result, not a duplicate.",
          "PUT/DELETE are idempotent by design.",
        ],
      },
      {
        id: "api-duplicate-prevention",
        title: "Duplicate Request Prevention",
        principle:
          "Guard against duplicate submissions from double-clicks, retries, or at-least-once delivery.",
        rules: [
          "Enforce uniqueness at the database layer (unique index) for natural keys.",
          "De-duplicate within a short window using request fingerprint or idempotency key.",
          "Return `409 Conflict` (not 500) when a duplicate is detected.",
        ],
        dos: [
          "Disable submit buttons while a request is in flight (frontend).",
          "Treat duplicate as a successful no-op when the effect already exists.",
        ],
        donts: [
          "Depend only on client-side debouncing.",
          "Insert without a uniqueness guard.",
        ],
        checklist: [
          "Unique constraints exist for natural keys.",
          "Duplicates return 409, not a crash.",
        ],
      },
      {
        id: "api-request-validation",
        title: "Request Validation",
        principle:
          "Validate every request at the boundary; never trust client input. Reject early with clear errors.",
        rules: [
          "Define typed schemas (Pydantic) for body, query, and path params.",
          "Validate types, ranges, lengths, enums, and required fields.",
          "Reject unknown/extra fields for strict endpoints; whitelist allowed values.",
          "Return `422` with field-level messages on validation failure.",
        ],
        dos: [
          "Normalize input (trim, lowercase emails) before validation.",
          "Centralize reusable validators.",
        ],
        donts: [
          "Perform ad-hoc `if` checks scattered across handlers.",
          "Echo raw invalid input back into queries.",
        ],
        checklist: [
          "Every endpoint has a request schema.",
          "Invalid input yields 422 with details.",
        ],
        code: {
          language: "python",
          good: "class ClientCreate(BaseModel):\n    name: str = Field(..., min_length=1, max_length=120)\n    rate_limit: Optional[int] = Field(None, ge=1, le=100000)",
          bad: "async def create(body: dict):\n    name = body[\"name\"]  # no validation, KeyError risk",
        },
      },
      {
        id: "api-response-standardization",
        title: "Response Standardization",
        principle:
          "Consistent, predictable response shapes let clients integrate once and reuse everywhere.",
        rules: [
          "Use consistent field naming (snake_case) and stable schemas across endpoints.",
          "List endpoints expose total count (e.g. `X-Total-Count`) and consistent pagination.",
          "Never leak internal identifiers (e.g. Mongo `_id`); expose stable public `id`.",
          "Use correct HTTP status codes (200/201/204/4xx/5xx).",
        ],
        dos: [
          "Return typed DTOs via a single serializer per resource.",
          "Keep date/times ISO-8601 UTC.",
        ],
        donts: [
          "Return raw DB documents.",
          "Change response shape per caller.",
        ],
        checklist: [
          "One serializer per resource.",
          "No ObjectId leaks; status codes correct.",
        ],
      },
      {
        id: "api-error-standardization",
        title: "Error Code Standardization",
        principle:
          "Errors are part of the contract: predictable, machine-readable, and safe (no internal leakage).",
        rules: [
          "Return a consistent error body (e.g. `{ detail }` or `{ error: { code, message } }`).",
          "Map failures to correct status: 400/401/403/404/409/422/429/5xx.",
          "Do not expose stack traces or internal messages to clients.",
          "Use stable error codes/strings that clients can branch on.",
        ],
        dos: [
          "Log the internal cause; return a safe summary + correlation id.",
          "Document every error a client may receive.",
        ],
        donts: [
          "Return 200 with an error payload.",
          "Return 500 for expected/validation failures.",
        ],
        checklist: [
          "Uniform error body shape.",
          "No stack traces in responses.",
        ],
      },
      {
        id: "api-authn-authz",
        title: "Authentication & Authorization",
        principle:
          "Authenticate every non-public request and authorize by role/scope. Deny by default.",
        rules: [
          "Require Bearer JWT (users) or API keys (integrations) on protected routes.",
          "Enforce role checks (e.g. admin) for privileged mutations.",
          "Scope API keys; grant least privilege (per-resource + read/write).",
          "Store only hashed secrets; show raw keys once.",
        ],
        dos: [
          "Centralize auth in middleware/dependencies.",
          "Keep a small explicit public allowlist.",
        ],
        donts: [
          "Trust client-sent role/identity fields.",
          "Log tokens or API keys.",
        ],
        checklist: [
          "Protected routes reject anonymous access.",
          "Mutations enforce role/scope.",
          "Secrets stored hashed.",
        ],
      },
      {
        id: "api-rate-limiting",
        title: "Rate Limiting",
        principle:
          "Protect the service from overload and abuse by bounding request rate per client/key.",
        rules: [
          "Apply per-key/per-IP limits with a fixed or sliding window.",
          "Return `429` with a `Retry-After` header when exceeded.",
          "Allow configurable, per-client overrides of the global default.",
          "Never count rejected (429) requests as served usage.",
        ],
        dos: [
          "Expose limit/window via config (env).",
          "Surface limits & usage to integrators.",
        ],
        donts: [
          "Apply a single global limit with no override.",
          "Silently drop requests without a 429.",
        ],
        checklist: [
          "Per-key limit enforced.",
          "429 + Retry-After returned.",
        ],
      },
      {
        id: "api-timeout-retry",
        title: "Request Timeout & Retry Strategy",
        principle:
          "Every outbound call has a timeout; retries are bounded, backed off, and only for idempotent/transient failures.",
        rules: [
          "Set explicit connect/read timeouts on all external HTTP calls.",
          "Retry only idempotent operations, with exponential backoff + jitter and a max attempt cap.",
          "Do not retry on 4xx (except 408/429); respect `Retry-After`.",
          "Fail fast and return a clear error when budget is exhausted.",
        ],
        dos: [
          "Use a circuit breaker for repeatedly failing dependencies.",
          "Make retried operations idempotent.",
        ],
        donts: [
          "Retry non-idempotent writes blindly.",
          "Leave calls without a timeout (hang the worker).",
        ],
        checklist: [
          "All external calls have timeouts.",
          "Retries are bounded with backoff.",
        ],
      },
      {
        id: "api-correlation-id",
        title: "Correlation ID / Request ID",
        principle:
          "Every request carries a unique id that flows through logs and responses for end-to-end tracing.",
        rules: [
          "Accept an inbound `X-Request-ID`; generate one (UUID) if absent.",
          "Attach the id to all logs for that request.",
          "Echo the id back in the response header (and in error bodies).",
          "Propagate the id to downstream/external calls.",
        ],
        dos: [
          "Store the id in request context/state.",
          "Include the id when reporting incidents.",
        ],
        donts: [
          "Generate a new id per log line.",
          "Drop the id at service boundaries.",
        ],
        checklist: [
          "Responses include X-Request-ID.",
          "Logs are correlated by request id.",
        ],
      },
      {
        id: "api-req-res-logging",
        title: "Request & Response Logging",
        principle:
          "Log enough to debug and audit, never enough to leak secrets or PII.",
        rules: [
          "Log method, path, status, latency, client/key id, and correlation id.",
          "Redact secrets, tokens, passwords, and sensitive PII.",
          "Record mutations in an immutable audit log (who/what/when).",
          "Use structured logging with consistent levels.",
        ],
        dos: [
          "Sample or truncate large bodies.",
          "Separate audit trail from debug logs.",
        ],
        donts: [
          "Log full auth headers or raw payloads with secrets.",
          "Rely on print statements.",
        ],
        checklist: [
          "Access + audit logs present.",
          "No secrets/PII in logs.",
        ],
      },
      {
        id: "api-transaction-consistency",
        title: "Transaction Consistency",
        principle:
          "A request either fully succeeds or leaves no partial state; related writes are atomic.",
        rules: [
          "Group related writes into a transaction (or an atomic single-document update).",
          "On failure, roll back / compensate so no partial mutation persists.",
          "Order side effects after the durable commit where possible.",
          "Use optimistic concurrency (version) to avoid lost updates.",
        ],
        dos: [
          "Prefer single-document atomic updates in MongoDB.",
          "Use compensating actions for multi-step workflows (saga).",
        ],
        donts: [
          "Perform multi-step writes without a rollback path.",
          "Emit external side effects before the write is durable.",
        ],
        checklist: [
          "No partial state on failure.",
          "Concurrency conflicts handled.",
        ],
      },
      {
        id: "api-payload-integrity",
        title: "Payload Integrity Verification",
        principle:
          "Verify that payloads are authentic and untampered — critical for webhooks and inter-service calls.",
        rules: [
          "Verify webhook signatures (HMAC) and reject on mismatch.",
          "Enforce a max payload size and correct Content-Type.",
          "Validate against a schema before processing.",
          "Use HTTPS/TLS for all traffic; add checksums for large uploads.",
        ],
        dos: [
          "Use constant-time comparison for signatures.",
          "Reject expired/replayed signed requests (timestamp + nonce).",
        ],
        donts: [
          "Trust unsigned webhooks.",
          "Process before verifying integrity.",
        ],
        checklist: [
          "Webhook signatures verified.",
          "Payload size/type enforced.",
        ],
      },
      {
        id: "api-monitoring",
        title: "API Monitoring",
        principle:
          "You can't operate what you can't see: track health, traffic, errors, and latency.",
        rules: [
          "Expose a health endpoint (liveness/readiness incl. DB check).",
          "Track RED metrics: Rate, Errors, Duration per endpoint.",
          "Record per-client usage (request counts, last-used, trends).",
          "Alert on error-rate and latency thresholds.",
        ],
        dos: [
          "Surface usage stats to admins/integrators.",
          "Keep dashboards for spikes and anomalies.",
        ],
        donts: [
          "Ship without health checks.",
          "Discover outages only from user reports.",
        ],
        checklist: [
          "Health endpoint present.",
          "Per-client usage tracked.",
        ],
      },
      {
        id: "api-versioning",
        title: "API Versioning",
        principle:
          "Evolve the API without breaking existing clients by versioning the contract.",
        rules: [
          "Version the API (URI `/api/v1` or header) from the start.",
          "Never change the meaning of an existing field within a version.",
          "Additive changes are fine; breaking changes require a new version.",
          "Publish a deprecation policy and sunset timeline.",
        ],
        dos: [
          "Document each version's contract.",
          "Support the previous version during migration.",
        ],
        donts: [
          "Break clients silently in-place.",
          "Maintain unlimited versions forever.",
        ],
        checklist: [
          "Version is explicit.",
          "Deprecation policy documented.",
        ],
      },
      {
        id: "api-backward-compat",
        title: "Backward Compatibility",
        principle:
          "New releases must not break existing integrations; prefer additive, tolerant changes.",
        rules: [
          "Only add optional fields; never remove/rename fields in a live version.",
          "Provide safe defaults for new inputs so old clients keep working.",
          "Follow the robustness principle: be liberal in what you accept.",
          "Communicate and stage breaking changes behind a new version + flag.",
        ],
        dos: [
          "Contract-test against previous client expectations.",
          "Keep deserialization tolerant of unknown fields.",
        ],
        donts: [
          "Tighten validation on an existing field without notice.",
          "Change status codes/semantics of existing endpoints.",
        ],
        checklist: [
          "Changes are additive/optional.",
          "Old clients still pass contract tests.",
        ],
      },
      {
        id: "api-design",
        title: "API Design",
        principle:
          "APIs are consistent, predictable, and resource-oriented. A clear contract makes life easy for consumers.",
        rules: [
          "All backend routes are prefixed with `/api` (ingress rule).",
          "Use plural-noun resources (`/api/offices`).",
          "Map HTTP verbs correctly (GET/POST/PUT/PATCH/DELETE).",
          "Status codes match meaning (201 create, 204 no-content, 4xx/5xx).",
        ],
        dos: [
          "Design the contract before implementation.",
          "Be consistent in naming & payload shape.",
        ],
        donts: [
          "Verbs in the URL (`/getOffices`).",
          "Backend routes without the `/api` prefix.",
        ],
        checklist: [
          "All routes use `/api`.",
          "Resource-oriented & consistent.",
          "Correct verbs & status codes.",
        ],
        code: {
          language: "python",
          good: "@api_router.post(\"/offices\", status_code=201)\n@api_router.get(\"/offices\")\n@api_router.delete(\"/offices/{office_id}\")",
          bad: "@app.get(\"/getAllOffices\")   # no /api, verb in URL",
        },
      },
      {
        id: "serialization-safety",
        title: "Serialization Safety",
        principle:
          "Never return raw MongoDB documents. BSON types (ObjectId, datetime) are not JSON-serializable and either leak internals or crash endpoints.",
        rules: [
          "Convert ObjectId -> str and map `_id` -> `id` before returning (PyObjectId / from_mongo helpers).",
          "Never spread a raw Mongo doc (`{**doc}`) into a response or into another document.",
          "Exclude `_id` from any dict reused as a payload (e.g. audit `request`) — drivers mutate the dict on insert.",
          "Defensive net for list endpoints: coerce with `json.loads(json.dumps(docs, default=str))`.",
          "Persist nested datetimes as ISO 8601 (UTC) strings, not raw datetime.",
        ],
        dos: [
          "Centralize (de)serialization in a base model / helper.",
          "Project out `_id` when not needed (`{'_id': 0}`).",
        ],
        donts: [
          "Returning `find()` results directly.",
          "Passing a just-inserted dict (now carrying `_id`) into a log/audit record.",
        ],
        checklist: [
          "No ObjectId reaches the client.",
          "No raw Mongo doc is spread into responses/other docs.",
          "A single legacy BSON value can't 500 a list endpoint.",
        ],
      },
      {
        id: "integration-management",
        title: "Integration Management",
        principle:
          "Third-party integrations must be resilient to failure & isolated from the application core.",
        rules: [
          "Wrap external calls with timeout, retry (backoff), and a circuit breaker.",
          "Store integration credentials in the environment.",
          "Isolate the SDK/client in one module (don't let it spread).",
          "Handle graceful degradation (fallback) when a service is down.",
        ],
        dos: [
          "Timeout & retry for all network calls.",
          "Correlation logs for integration debugging.",
        ],
        donts: [
          "Calling external APIs without a timeout.",
          "Spreading the SDK across many layers.",
        ],
        checklist: [
          "Timeout & retry exist.",
          "Credentials from the environment.",
          "Client isolated & a fallback exists.",
        ],
      },
    ],
  },

];

// Dev Guidelines menu & overview are ordered alphabetically (A–Z) by title.
guidelineGroups.sort((a, b) => a.title.localeCompare(b.title));

/** id → group map for fast lookup in the renderer. */
export const guidelineGroupById = Object.fromEntries(
  guidelineGroups.map((g) => [g.id, g]),
);

/** Total topic count for badges/overview. */
export const totalTopics = guidelineGroups.reduce(
  (sum, g) => sum + g.topics.length,
  0,
);
