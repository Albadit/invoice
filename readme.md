# Invoice Management System

A modern, full-stack invoice management application built with **Next.js 16**, **React 19**, and **Supabase**. Designed for performance at scale with support for 10M+ rows using optimized database patterns.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Supabase](https://img.shields.io/badge/Supabase-Self--Hosted-green?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)

## ✨ Features

- **Invoice Management** - Create, view, edit, and manage invoices with line items
- **PDF Generation** - Generate professional PDF invoices using Puppeteer
- **Multi-Currency Support** - Handle invoices in different currencies
- **Company Profiles** - Manage company information for invoices
- **Invoice Templates** - Customizable invoice templates with styling
- **Fast Search** - Full-text search with trigram fallback for substring matching
- **Cursor Pagination** - O(1) keyset pagination for large datasets
- **Internationalization** - Multi-language support (English, Dutch, Albanian, Macedonian)
- **Dark/Light Mode** - Theme switching with `next-themes`
- **Responsive UI** - Built with HeroUI component library

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Component Library**: [HeroUI](https://heroui.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **i18n**: [i18next](https://www.i18next.com/) + react-i18next
- **PDF**: [Puppeteer](https://pptr.dev/)

### Backend
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth (GoTrue)
- **API**: Supabase PostgREST
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

## 📁 Project Structure

```
invoice/
├── docker/                 # Docker Compose setup for self-hosted Supabase
│   ├── docker-compose.yml  # Main compose file
│   ├── dev/                # Development overrides
│   └── volumes/            # Persistent data volumes
│
└── frontend/               # Next.js application
    ├── app/                # App Router (pages, layouts, routes)
    ├── features/           # Domain-specific modules
    │   ├── invoice/        # Invoice feature (API, components)
    │   └── settings/       # Settings feature
    ├── components/         # Shared UI components
    ├── lib/                # Shared libraries & utilities
    ├── db/                 # Database schemas & migrations
    ├── locales/            # Translation files
    └── scripts/            # Database management scripts
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) & Docker Compose
- [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/invoice.git
cd invoice
```

### 2. Start Supabase Backend

```bash
cd docker
cp .env.example .env  # Configure your environment variables
docker compose up -d
```

This starts the complete Supabase stack including:
- PostgreSQL database
- Supabase Studio (dashboard)
- Kong API Gateway
- GoTrue Auth
- PostgREST API
- Realtime server
- Storage API

### 3. Setup Frontend

```bash
cd frontend
npm install
```

### 4. Configure Environment

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Initialize Database

```bash
# Apply schema and seed initial data
npm run db:migrate

# Or run individually:
npm run db:schema    # Apply database schema
npm run db:seed      # Seed initial data
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run schema + seed |
| `npm run db:schema` | Apply database schema |
| `npm run db:seed` | Seed database |
| `npm run db:drop` | Drop all tables |
| `npm run db:reset` | Drop + migrate (fresh start) |
| `npm run db:generate-types` | Generate TypeScript types from DB |

## 🐳 Docker Deployment

Run the entire stack (frontend + Supabase) with Docker:

```bash
cd docker
docker compose up -d
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Supabase Studio**: http://localhost:3001
- **API Gateway**: http://localhost:8000

## 🗄️ Database Schema

The application uses a PostgreSQL database with the following main entities:

- **invoices** - Invoice records with status tracking
- **invoice_items** - Line items for each invoice
- **companies** - Company profiles (issuer/recipient)
- **currencies** - Supported currencies
- **templates** - Invoice templates with custom styling

Invoice statuses: `pending`, `paid`, `overdue`, `cancelled`

## 🌍 Internationalization

The application supports multiple languages:
- 🇺🇸 English (en)
- 🇳🇱 Dutch (nl)
- 🇦🇱 Albanian (al)
- 🇲🇰 Macedonian (mk)

Translation files are located in `frontend/locales/`.

## 📖 Architecture

This project follows a **feature-first** architecture with strict dependency rules enforced by `eslint-plugin-boundaries`. See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.