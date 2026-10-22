# WorkSync ⚡
### Enterprise Automation & Workflow Management Platform

> **Automate Your Work. Sync Everything.**  
> WorkSync connects your apps and automates repetitive tasks so you can focus on what matters.

Inspired by industry leaders like Zapier and Make, **WorkSync** is a full-stack SaaS automation platform that empowers users to design, test, monitor, and execute automated multi-step workflows across applications.

---

## 🏗️ System Architecture

WorkSync is architected as a clean decoupled application:

```
WorkSync/
├── frontend/                # React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
│   ├── src/
│   │   ├── components/      # AppIcon, StatusBadge, ExecutionTestModal, Modal
│   │   ├── context/         # AuthContext (JWT session state & demo login)
│   │   ├── layouts/         # DashboardLayout (Responsive sidebar & navigation)
│   │   ├── pages/           # Landing, Login, Register, Dashboard, Builder, Workflows, History, Apps, Settings
│   │   ├── services/        # Centralized typed HTTP API service
│   │   ├── types/           # TypeScript interfaces for Workflows, Executions, Apps
│   │   ├── App.tsx          # Router with Protected Routes
│   │   └── main.tsx
│   └── package.json
│
├── backend/                 # Node.js, Express, TypeScript, MongoDB (Mongoose)
│   ├── src/
│   │   ├── controllers/     # Auth, Workflow, Execution, Analytics, Apps controllers
│   │   ├── middleware/      # JWT Authentication & Global Error Handling
│   │   ├── models/          # User, Workflow, Execution, Integration Mongoose models
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # ExecutionEngine & SeedService
│   │   ├── types/           # Backend TypeScript definitions
│   │   └── server.ts        # Express entry point & MongoDB connection
│   └── package.json
│
├── .env.example             # Environment configuration template
└── README.md
```

---

## 🌟 Core Features

### 1. Landing Page (`/`)
- **Brand Hero Banner**: Clear value proposition with animated visual flow visualizer.
- **Interactive Simulation**: Users can trigger live animated workflow passes in the hero section.
- **Feature Highlights**: Drag-and-drop workflow canvas, sub-second execution engine, dynamic variable tags, task audit history.
- **Ready-Made Templates**: 1-click popular workflow cards (e.g., Email to Slack, Forms to Discord).

### 2. Authentication (`/login`, `/register`)
- **JWT Authentication**: Password hashing with bcrypt, token verification middleware.
- **1-Click Demo Login**: Explore the full platform immediately with pre-seeded demo workflows and telemetry.
- **Protected Routes**: Secure access for all dashboard and execution endpoints.

### 3. Professional SaaS Dashboard (`/dashboard`)
- **Key Metrics**: Total Workflows, Active Workflows, Tasks Executed, Failed Tasks, and Success Rate %.
- **7-Day Activity Chart**: Visual telemetry showing daily successful vs. failed runs.
- **Recent Workflows Table**: Name, trigger/action badges, active toggle, task count, and 1-click test button.
- **Live Task Feed**: Real-time log of recent executions with millisecond durations.

### 4. Visual Workflow Builder (`/workflows/create`, `/workflows/:id/edit`)
- **Visual Node Flow**: Visual trigger, conditional filter, and action node representations.
- **6-Step Guided Creation Process**:
  1. **Workflow Details**: Name and description.
  2. **Choose Trigger**: Gmail, Google Sheets, Google Forms, Slack, Webhooks, Schedule, Discord, Notion, GitHub.
  3. **Configure Trigger**: Accounts, subject filters, spreadsheet IDs, or generated inbound webhook URLs.
  4. **Choose Action**: Slack, Gmail, Google Sheets, Discord, Microsoft Teams, Webhook, Notion.
  5. **Configure Action**: Message formats, channels, dynamic variable tags (`{{trigger.subject}}`, `{{trigger.sender}}`, `{{trigger.snippet}}`).
  6. **Review & Test**: Flow inspection with live simulation modal.

### 5. Workflow Execution Engine
- **Simulated & Real Ingestion**: Generates realistic trigger payloads or accepts incoming live HTTP POST webhooks at `/api/workflows/webhook/:webhookId`.
- **Condition Evaluator**: Supports `contains`, `equals`, `not_contains`, `greater_than`, `less_than`, and `exists`.
- **Variable Interpolation**: Replaces `{{trigger.*}}` tags in real-time.
- **Step-by-Step Audit Logging**: Records timestamps, status codes, input payloads, and dispatched responses into MongoDB.

### 6. Workflow Management (`/workflows`)
- Comprehensive list of all workflows with search and status filters (All, Active, Inactive, Recent).
- Actions for each workflow: Test Now, Edit, Duplicate, Toggle Status, Delete, and View History.

### 7. Task History & Audit Logs (`/history`)
- Columns: Workflow, Trigger, Action, Status, Started At, Completed At, Duration.
- Inspection Drawer: Complete JSON request/response inspection and millisecond timeline.
- Filter by status (All, Success, Failed) and clear history options.

### 8. Apps Marketplace (`/apps`)
- Catalog cards for Gmail, Google Sheets, Google Forms, Slack, Discord, Webhooks, Microsoft Teams, Notion, and GitHub.
- Interactive connection and authorization modal with simulated credentials.

### 9. Account & Settings (`/settings`)
- Profile update (Full name, Email).
- Security (Password change with current password validation).
- Notification preferences (Email digests, error alerts, auto-retry).
- Personal Inbound Webhook API key with sample `cURL` commands.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB running locally (default: `mongodb://127.0.0.1:27017/worksync`)

### 1. Environment Setup

Create `.env` in `backend/`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/worksync
JWT_SECRET=worksync-super-secret-jwt-key-2026-production
NODE_ENV=development
```

Create `.env` in `frontend/`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 2. Start Backend Server
```bash
cd backend
npm install
npm run build
npm start
# Server running at http://localhost:5000
```

### 3. Start Frontend Development Server
```bash
cd frontend
npm install
npm run dev
# Frontend running at http://127.0.0.1:5173
```

---

## 📡 API Reference

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/demo` - 1-Click demo account session
- `GET /api/auth/me` - Current authenticated user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password
- `PUT /api/auth/preferences` - Update notification settings

### Workflows
- `GET /api/workflows` - List user workflows (supports `status`, `search`, `sort`)
- `POST /api/workflows` - Create new workflow
- `GET /api/workflows/:id` - Fetch single workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow & history
- `PATCH /api/workflows/:id/toggle` - Toggle active/paused state
- `POST /api/workflows/:id/duplicate` - Clone workflow
- `POST /api/workflows/:id/test` - Run simulated test execution
- `POST /api/workflows/webhook/:webhookId` - Public webhook trigger endpoint

### Executions & History
- `GET /api/history` - List workflow execution history
- `GET /api/history/:id` - Inspect specific execution
- `DELETE /api/history` - Clear task history

### Dashboard & Analytics
- `GET /api/analytics/stats` - Total counts and 7-day activity telemetry

### Apps & Integrations
- `GET /api/apps` - List app catalog and connection status
- `POST /api/apps/:appId/connect` - Connect application credentials
- `POST /api/apps/:appId/disconnect` - Disconnect application
# WorkSync
