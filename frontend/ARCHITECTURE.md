# Frontend Architecture Overview

This project is built with **Next.js 16** and **React 19**, following a strict **feature-first** architecture to ensure scalability, maintainability, and clear separation of concerns.

## Tech Stack

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
*   **UI Library**: [React 19](https://react.dev/)
*   **Component Library**: [HeroUI](https://heroui.com/) (formerly NextUI)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)
*   **Theming**: `next-themes` for Dark/Light mode support
*   **Linting**: `eslint-plugin-boundaries` for architectural enforcement

## Architecture Layers

The application is structured into three distinct layers with strict dependency rules:

1.  **App Layer** (`app/`)
    *   **Role**: The application shell. Handles routing, layouts, and page composition.
    *   **Dependencies**: Can import from `features` and `shared`.
    *   **Responsibility**: Wiring everything together.
    *   **Route Groups**:
        *   `(public)` — Pages accessible **without** authentication (e.g., landing page, about, pricing).
        *   `(auth)` — Authentication-related pages (e.g., login, signup, forgot password). Uses a minimal/centered layout.
        *   `(protected)` — Pages that **require** authentication (e.g., dashboard, settings, profile). Protected by auth middleware/guards.

2.  **Feature Layer** (`features/`)
    *   **Role**: Domain-specific business logic and UI (e.g., `auth`, `users`, `bookings`).
    *   **Dependencies**: Can import from `shared` and *its own* feature folder.
    *   **Restriction**: **Cannot** import from `app` or *other* features (cross-feature dependencies are disallowed to prevent tight coupling).

3.  **Shared Layer** (`components/`, `lib/`, `utils/`, `contexts/`, `config/`)
    *   **Role**: Reusable, domain-agnostic building blocks.
    *   **Dependencies**: Can only import from other `shared` modules.
    *   **Restriction**: **Cannot** import from `app` or `features`.

## Folder Structure

```text
frontend/
├── app/                  # Next.js App Router (Pages, Layouts, Route Handlers)
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   ├── (auth)/           # Authentication route group (login, signup, etc.)
│   │   ├── login/        # Login page
│   │   ├── signup/       # Signup page
│   │   ├── forgot-password/ # Forgot password page
│   │   └── [routes]/     # Other auth routes (e.g., /verify-email, /reset-password)
│   ├── (public)/         # Unauthenticated route group (no auth required)
│   │   └── [routes]/     # Public routes (e.g., /about, /pricing)
│   └── (protected)/      # Authenticated route group (auth required)
│       └── [routes]/     # Other protected routes
│
├── features/             # Domain-specific modules (Business Logic + UI)
│   ├── auth/             # Authentication feature
│   ├── users/            # User management feature
│   └── [feature]/        # Other features (e.g., bookings, clinics)
│       ├── components/   # Feature-specific components
│       ├── hooks/        # Feature-specific hooks
│       └── types.ts      # Feature-specific types
│
├── components/           # Shared UI Components (Design System)
│   ├── ui/               # Low-level UI primitives (buttons, inputs)
│   ├── layout/           # Layout components (headers, footers)
│   └── [component].tsx   # Reusable components
│
├── lib/                  # Shared Libraries & Configuration
│   ├── api.ts            # API client configuration
│   ├── utils.ts          # General utility functions
│   └── types.ts          # Shared TypeScript definitions
│
├── contexts/             # Global React Contexts
│   ├── AuthContext.tsx   # Authentication state
│   └── [Context].tsx     # Other global providers
│
├── config/               # Static Configuration
│   ├── site.ts           # Site metadata
│   └── fonts.ts          # Font configuration
│
├── styles/               # Global Styles
│   └── globals.css       # Tailwind directives & global CSS
│
└── utils/                # Helper functions (formatting, validation)
```

## Architectural Enforcement

We use `eslint-plugin-boundaries` to automatically enforce these rules. If you try to import a feature into a shared component, or import one feature into another, the linter will throw an error.

### Why this structure?

*   **Scalability**: New features can be added without touching existing code.
*   **Maintainability**: Changes in one feature don't accidentally break another.
*   **Refactoring**: Features can be easily moved, removed, or rewritten.
*   **Clarity**: It's immediately obvious where code belongs based on its domain or reusability.

## Key Directories Explained

### `app/`
Contains the application routing logic. Files here should primarily focus on layout and data fetching (for Server Components), delegating complex UI and logic to components in `features/` or `components/`.

The `app/` directory uses **Next.js Route Groups** to separate public and protected areas:

*   **`(auth)/`** — Contains authentication-related pages (login, signup, forgot password, etc.). Logged-in users can be redirected away from these pages.
*   **`(public)/`** — Contains pages that do **not** require authentication. Routes inside are accessible to all visitors (e.g., /about, /pricing).
*   **`(protected)/`** — Contains pages that **require** a logged-in user. Access is guarded by auth middleware or a layout-level check (e.g., dashboard, settings).

> **Note**: Route group folders (wrapped in parentheses) do **not** affect the URL structure. A file at `app/(public)/about/page.tsx` maps to `/about`, not `/(public)/about`.

### `features/`
This is where the bulk of the business logic lives. Each folder represents a domain.
*   **Example**: `features/auth` contains the login form, signup form, auth hooks, and auth-related types.

### `components/`
Contains reusable UI components that are **domain-agnostic**.
*   **Rule of Thumb**: If a component mentions a specific business entity (like "Patient" or "Appointment"), it probably belongs in `features/`. If it's a generic "Card" or "Button", it belongs here.

### `lib/` & `utils/`
*   `lib/`: Typically for wrapping external libraries or complex logic (e.g., API clients, JWT handling).
*   `utils/`: For pure helper functions (e.g., date formatting, string manipulation).
