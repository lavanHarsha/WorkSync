# WorkSync ⚡
### Enterprise-Grade Workflow Automation & Orchestration Platform

> **Automate Your Work. Sync Everything.**  
> WorkSync connects disparate SaaS applications and automates multi-step workflows with real-time execution, event-driven webhooks, scheduled triggers, and end-to-end cryptographic security.

Inspired by industry standards like Zapier, n8n, and Make, **WorkSync** is a full-stack, distributed automation platform engineered for high-throughput workflow execution, visual pipeline design, resilient background job queuing, and real-time observability.

---

## 📑 Table of Contents
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Core Features](#-core-features)
- [Database Models & Schemas](#-database-models--schemas)
- [Background Queue & Scheduling Architecture](#-background-queue--scheduling-architecture)
- [Security & Cryptography](#-security--cryptography)
- [API Reference](#-api-reference)
- [Environment Variables](#-environment-variables)
- [Local Development Setup](#-local-development-setup)
- [Production Deployment Guide](#-production-deployment-guide)
- [Verification & Automated Tests](#-verification--automated-tests)

---

## 🏗️ System Architecture

WorkSync follows a decoupled client-server architecture with an asynchronous queue worker pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                       WorkSync Client                       │
│    (React 18 + Vite + Tailwind CSS + Lucide + Context API)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON / Cookies
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    WorkSync API Gateway                     │
│    (Express 4 + TypeScript + Helmet + CORS + Rate Limiter)  │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       Mongoose Documents               BullMQ Enqueue / Schedule
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│      Primary Database        │ │      Queue & Cache          │
│    MongoDB Atlas (Replica)   │ │  Upstash Redis (Serverless) │
│  - Users & Integrations      │ │  - workflow-execution queue │
│  - Workflows & Step Configs  │ │  - Repeatable cron schedules│
│  - Audit Logs & Executions   │ │  - Trigger poller lock/state│
└──────────────────────────────┘ └─────────────┬───────────────┘
                                               │
                                       Job Dispatch
                                               │
                                               ▼
                               ┌──────────────────────────────┐
                               │   Execution Worker Engine    │
                               │  - Variable Interpolation    │
                               │  - Condition Evaluator       │
                               │  - App Integration Clients   │
                               │  - Exponential Backoff Retry │
                               └───────────────┬──────────────┘
                                               │
                               Outbound HTTP Calls / OAuth
                                               │
                                               ▼
                              ┌────────────────────────────────┐
                              │ Third-Party SaaS Ecosystem     │
                              │ (Gmail, Google Sheets, Forms,  │
                              │  Slack, Discord, Teams, GitHub,│
                              │  Notion, Inbound Webhooks)     │
                              └────────────────────────────────┘
```

### Repository Structure
```
WorkSync/
├── frontend/                     # Modern Client SPA
│   ├── public/                   # Static assets & icons
│   ├── src/
│   │   ├── components/           # UI elements (AppIcon, StatusBadge, ExecutionTestModal)
│   │   ├── context/              # AuthContext (JWT, user state, demo login)
│   │   ├── layouts/              # DashboardLayout (Sidebar, topbar, navigation)
│   │   ├── pages/                # Landing, Login, Register, Dashboard, Builder,
│   │   │                         # Workflows, TaskHistory, Apps, Settings
│   │   ├── services/             # Typed API client with auto-refresh & dynamic URL generation
│   │   ├── types/                # Shared TypeScript contracts & interfaces
│   │   ├── App.tsx               # Client routes & protected route wrappers
│   │   └── main.tsx              # React DOM entrypoint
│   ├── vercel.json               # SPA routing rewrite rule for Vercel
│   ├── vite.config.ts            # Vite bundler & development proxy setup
│   └── package.json
│
├── backend/                      # Distributed Node.js / Express API & Worker
│   ├── src/
│   │   ├── controllers/          # Request handlers (auth, workflow, execution, analytics, apps)
│   │   ├── integrations/         # Providers: google, github, notion, triggers, credentials
│   │   ├── middleware/           # authGuard, rateLimiter, requestLogger, errorHandler
│   │   ├── models/               # Mongoose schemas: User, Workflow, Execution, Integration
│   │   ├── queues/               # BullMQ connection & executionQueue management
│   │   ├── routes/               # Express modular route definitions
│   │   ├── services/             # ExecutionEngine, TriggerPoller, SchedulerHelper, SeedService
│   │   ├── utils/                # Crypto (AES-256-GCM), Logger (Pino), Secrets validator
│   │   ├── workers/              # BullMQ ExecutionWorker daemon & repeatable pollers
│   │   └── server.ts             # Server bootstrap, MongoDB connection, graceful shutdown
│   ├── Dockerfile                # Production multi-stage container
│   ├── tsconfig.json             # TypeScript compiler settings
│   └── package.json
│
├── .env.example                  # Master environment variable template
├── docker-compose.yml            # Local containerized orchestration (Mongo + Redis)
└── README.md                     # Comprehensive project documentation
```

---

## 💻 Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS + PostCSS + Autoprefixer
- **Icons**: Lucide React
- **Routing**: React Router DOM 6 with Protected & Guest Routes
- **HTTP Client**: Native Fetch with automatic 401 token refresh interceptor

### Backend API & Workers
- **Runtime**: Node.js 20+ with TypeScript 5
- **Web Framework**: Express 4
- **Database Layer**: Mongoose 8 (MongoDB ODM)
- **Task Queue & Scheduler**: BullMQ 6 + ioredis 6
- **Logging & Telemetry**: Pino + Pino-HTTP
- **Security**: Helmet, Cookie-Parser, CORS, Express-Rate-Limit, Zod validation
- **Cryptography**: Node.js `crypto` (AES-256-GCM at-rest encryption, HMAC-SHA256 nonces, bcryptjs password hashing)

### Cloud Infrastructure (100% Free Tier Supported)
- **Primary Database**: MongoDB Atlas (Shared M0 Sandbox - 512MB free forever)
- **Message Broker & Queue**: Upstash Redis (Serverless TLS - 10,000 commands/day free forever)
- **API Server & Worker**: Render.com (Free Web Service) or Railway
- **Client Hosting**: Vercel (Hobby Tier with global edge CDN)

---

## 🌟 Core Features

### 1. Visual Drag-and-Drop Workflow Builder (`/workflows/create`, `/workflows/:id/edit`)
- **6-Step Pipeline Designer**:
  1. **Details**: Title, description, and status tags.
  2. **Trigger App**: Gmail, Google Sheets, Google Forms, GitHub, Notion, Webhooks, Cron Schedule.
  3. **Trigger Config**: Filters, polling frequencies, spreadsheet IDs, or auto-generated webhook URLs.
  4. **Action App**: Slack, Gmail, Google Sheets, Discord, MS Teams, Notion, GitHub, Webhook.
  5. **Action Config**: Dynamic message templating using `{{trigger.variable}}` tags.
  6. **Review & Test**: Interactive execution test modal with simulated payload generators.
- **Dynamic Variable Interpolation**: Replaces placeholders like `{{trigger.subject}}`, `{{trigger.sender}}`, `{{trigger.body.url}}` in real-time.
- **Multi-Condition Evaluator**: Supports complex branching rules (`contains`, `equals`, `not_contains`, `greater_than`, `less_than`, `exists`).

### 2. Dual-Engine Execution Pipeline
- **Real-Time Webhook Ingestion**: Dedicated endpoint at `/api/workflows/webhook/:webhookId` supporting incoming payload parsing, signature verification, and instant execution.
- **Background Cron & Poller**: Repeatable job scheduler sweeps integrated SaaS apps (Gmail inbox, Sheets rows, Form responses, GitHub commits/issues, Notion pages) and queues runs when new items appear.
- **Simulated Test Runner**: Safe sandbox execution modal on frontend for verifying workflows without altering live external data.

### 3. Asynchronous BullMQ Execution Queue
- Decouples HTTP request ingestion from heavy third-party API dispatching.
- Exponential backoff retry policies (2s, 4s, 8s) for resilience against third-party rate limits.
- Configurable job retention (24 hours for completed, 7 days for failed audits).

### 4. Interactive SaaS Dashboard (`/dashboard`)
- Metric telemetry cards: Total Workflows, Active Workflows, Executed Tasks, Failed Tasks, Success Rate %.
- Visual 7-day activity chart illustrating successful vs. failed runs.
- Quick-toggle status switches and 1-click execution triggers.

### 5. Audit Logging & Execution History (`/history`)
- Granular chronological execution logs with millisecond timestamps.
- Inspection drawer showing full JSON payloads (raw trigger input, interpolated action payload, HTTP status codes, and provider responses).

### 6. App Marketplace & OAuth Central (`/apps`)
- Pre-built integration cards for 9+ cloud services.
- OAuth 2.0 flow with state nonce verification to eliminate CSRF attacks during redirects.
- Encrypted storage of Access & Refresh tokens.

---

## 🗄️ Database Models & Schemas

### 1. `User` Model (`backend/src/models/User.ts`)
| Field | Type | Details |
| :--- | :--- | :--- |
| `name` | `String` | Required, trimmed |
| `email` | `String` | Required, unique, indexed, lowercase |
| `password` | `String` | bcrypt hash (rounds = 10), excluded from queries by default (`select: false`) |
| `role` | `String` | Enum: `user` \| `admin` |
| `refreshTokenHash` | `String` | SHA-256 hash of active refresh token for rotation verification |
| `preferences` | `Object` | Email digests, error alerts, retry toggles |
| `apiKey` | `String` | Unique personal API key for webhook attribution |

### 2. `Workflow` Model (`backend/src/models/Workflow.ts`)
| Field | Type | Details |
| :--- | :--- | :--- |
| `userId` | `ObjectId` | Indexed reference to `User` |
| `name` | `String` | Required workflow display name |
| `enabled` | `Boolean` | Default: `true` |
| `trigger` | `Object` | `app`, `event`, `parameters`, `webhookId` |
| `action` | `Object` | `app`, `action`, `parameters` |
| `conditions` | `Array` | Logical filters: `field`, `operator`, `value` |
| `triggerState` | `Object` | Cursor tracking (e.g. `historyId`, `lastRow`, `lastTimestamp`) |
| `executionCount` | `Number` | Total successful executions |
| `failureCount` | `Number` | Total failed executions |

### 3. `Execution` Model (`backend/src/models/Execution.ts`)
| Field | Type | Details |
| :--- | :--- | :--- |
| `workflowId` | `ObjectId` | Indexed reference to `Workflow` |
| `userId` | `ObjectId` | Indexed reference to `User` |
| `status` | `String` | Enum: `running` \| `success` \| `failed` \| `filtered` |
| `triggerData` | `Object` | Snapshot of trigger payload |
| `steps` | `Array` | Array of step logs with step name, status, duration, input, and output |
| `error` | `String` | Sanitized error message if execution failed |
| `duration` | `Number` | Total runtime in milliseconds |

### 4. `Integration` Model (`backend/src/models/Integration.ts`)
| Field | Type | Details |
| :--- | :--- | :--- |
| `userId` | `ObjectId` | Reference to `User` (Compound unique index with `app`) |
| `app` | `String` | Enum: `gmail`, `google_sheets`, `github`, `notion`, etc. |
| `authType` | `String` | `oauth2` \| `api_key` \| `webhook_url` |
| `encryptedCredentials` | `String` | AES-256-GCM cipher string: `v1:<iv>:<tag>:<ciphertext>` |
| `status` | `String` | `connected` \| `disconnected` \| `expired` |

---

## 🔄 Background Queue & Scheduling Architecture

WorkSync uses **BullMQ** over Redis to prevent long-running tasks from locking the Express event loop:

1. **Repeatable Poller (`poll-triggers`)**:
   - Every minute, a background worker sweeps enabled workflows whose triggers require polling (e.g., checking for unread emails in Gmail or newly added rows in Google Sheets).
   - Uses cursor-based pagination stored in `Workflow.triggerState` so duplicate runs are never triggered.

2. **Cron Scheduler (`scheduleRepeatableJob`)**:
   - Workflows with a `schedule` trigger convert natural intervals (`every_minute`, `every_hour`, `every_day`) into Redis Repeatable Schedulers.

3. **Job Worker (`executionWorker`)**:
   - Workers pick jobs off the queue, pull encrypted credentials from MongoDB, decrypt them in memory, run the interpolation engine, execute outbound API calls, and persist step telemetry back to the database.

---

## 🔐 Security & Cryptography

- **At-Rest Token Encryption**: All third-party OAuth access tokens and refresh tokens are encrypted using **AES-256-GCM** via [backend/src/utils/crypto.ts](file:///c:/Users/lavan/Desktop/WorkSync/backend/src/utils/crypto.ts). Every encrypted record contains a unique 12-byte initialization vector (IV) and 16-byte authentication tag to guarantee integrity.
- **JWT Architecture with Token Rotation**:
  - **Access Token**: Short-lived (15 minutes), signed with `JWT_SECRET`.
  - **Refresh Token**: Long-lived (7 days), stored in an `httpOnly`, `secure`, `sameSite: none` cookie, with its SHA-256 hash stored in MongoDB. Every refresh rotates both the token and its stored hash, immediately revoking compromised sessions if token reuse is detected.
- **CORS & Reverse Proxy Defense**: Strict origin validation with automatic fallback for production Vercel domains, custom headers, and rate limiting (100 requests per 15 minutes for public endpoints).

---

## 📡 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Authenticate user & issue tokens |
| `POST` | `/api/auth/demo` | 1-Click demo login with pre-seeded data |
| `POST` | `/api/auth/refresh` | Rotate refresh token & issue new access token |
| `POST` | `/api/auth/logout` | Invalidate refresh token & clear cookies |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `PUT` | `/api/auth/profile` | Update user name & email |
| `PUT` | `/api/auth/password` | Change password with current password verification |
| `PUT` | `/api/auth/preferences` | Update notification preferences |

### Workflows (`/api/workflows`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/workflows` | List workflows (supports filters: `status`, `search`, `page`) |
| `POST` | `/api/workflows` | Create a new workflow |
| `GET` | `/api/workflows/:id` | Get workflow details |
| `PUT` | `/api/workflows/:id` | Update workflow definition |
| `DELETE`| `/api/workflows/:id` | Delete workflow and associated history |
| `PATCH`| `/api/workflows/:id/toggle` | Toggle enabled/disabled status |
| `POST` | `/api/workflows/:id/duplicate`| Clone an existing workflow |
| `POST` | `/api/workflows/:id/test` | Trigger simulated test execution |
| `POST` | `/api/workflows/webhook/:webhookId` | Public ingestion webhook trigger |

### Execution History (`/api/history`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/history` | List execution logs with status filters |
| `GET` | `/api/history/:id` | Inspect granular execution run details & steps |
| `DELETE`| `/api/history` | Clear task audit history |

### Analytics & Apps (`/api/analytics`, `/api/apps`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analytics/stats` | Dashboard statistics & 7-day timeline telemetry |
| `GET` | `/api/apps` | List available apps & connection status |
| `POST` | `/api/apps/:appId/connect` | Store API key / webhook credentials |
| `GET` | `/api/apps/:appId/oauth/start`| Initiate OAuth consent flow |
| `GET` | `/api/apps/:appId/oauth/callback`| OAuth callback with state verification |
| `POST` | `/api/apps/:appId/disconnect` | Revoke credentials & delete integration record |

### System Probe (`/api/health`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Liveness & readiness probe verifying MongoDB and Redis statuses |

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=production
LOG_LEVEL=info

# Databases (MongoDB Atlas + Upstash Redis)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/worksync?retryWrites=true&w=majority
REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379

# Cryptography (64 hex characters = 32 bytes)
ENCRYPTION_KEY=replace_with_64_character_hex_string_generate_using_crypto

# JWT Configuration (Minimum 32 characters in production)
JWT_SECRET=replace_with_random_string_at_least_32_characters
JWT_REFRESH_SECRET=replace_with_random_string_at_least_32_characters

# CORS & Domains (No trailing slashes)
API_PUBLIC_URL=https://worksync-backend.onrender.com
FRONTEND_URL=https://worksync.vercel.app
CORS_ORIGINS=https://worksync.vercel.app

# Optional OAuth Integrations
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=https://worksync-backend.onrender.com/api
```

---

## 🛠️ Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/lavanHarsha/WorkSync.git
cd WorkSync

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Files
Copy `.env.example` in both directories:
```bash
# In backend/
cp .env.example .env

# Generate encryption key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run Locally (Concurrent)
From the project root:
```bash
# Run backend (port 5000) and frontend (port 5173) simultaneously:
npm run dev
```

Or run each service individually:
```bash
# Backend:
cd backend && npm run dev

# Frontend:
cd frontend && npm run dev
```

---

## 🚀 Production Deployment Guide

WorkSync is architected to run permanently on free-tier cloud infrastructure:

### 1. Database (MongoDB Atlas M0 - Free Forever)
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a **Free M0** cluster in AWS.
2. Under **Network Access**, add `0.0.0.0/0` (Allow Access from Anywhere).
3. Under **Database Access**, create a user with `Read and write to any database` privileges.
4. Copy the connection string:
   ```text
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/worksync?retryWrites=true&w=majority
   ```

### 2. Task Queue (Upstash Redis - Free Forever)
1. Sign up at [Upstash](https://console.upstash.com/) and create a Regional Redis database.
2. Select the **TCP** tab under Connect and copy the `rediss://...` connection URL.

### 3. Backend Deployment (Render.com)
1. In the [Render Dashboard](https://dashboard.render.com/), create a **New Web Service** connected to your repository.
2. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
3. Add the environment variables from the Backend table above.
4. Deploy and copy your assigned service URL (e.g. `https://worksync-backend.onrender.com`).

### 4. Frontend Deployment (Vercel)
1. In the [Vercel Dashboard](https://vercel.com/), click **Add New Project** and import your repository.
2. Set:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
3. Add Environment Variable:
   - `VITE_API_URL` = `https://worksync-backend.onrender.com/api`
4. Click **Deploy**. Vercel will deploy your site with automatic SPA routing via `vercel.json`.

---

## 🧪 Verification & Automated Tests

WorkSync includes automated test suites covering cryptography, JWT authentication middleware, condition logic, variable interpolation, and the workflow execution engine.

Run tests in the backend:
```bash
cd backend
npm run test
```

Expected result:
```
 ✓ src/utils/crypto.test.ts (6 tests)
 ✓ src/middleware/auth.test.ts (5 tests)
 ✓ src/services/executionEngine.test.ts (17 tests)

 Test Files  3 passed (3)
      Tests  28 passed (28)
```

---

## 📄 License
This project is licensed under the MIT License.
