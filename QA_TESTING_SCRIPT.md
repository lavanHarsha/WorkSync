# WorkSync Platform - Quality Assurance & Software Testing Guide

**Target Application URL:** `https://work-sync-six.vercel.app/`  
**Backend API Engine:** `https://worksync-fobf.onrender.com/api`  
**Test Scope:** Full-Stack Manual & Functional Verification, Security & Boundary Testing, End-to-End Workflow Execution  
**QA Lead / Tester:** Software Test Engineer  
**Date:** October 2026  

---

## 📋 Copy-Paste Prompt for Your Employee

```text
Hi [Employee Name],

Please execute this complete Quality Assurance (QA) and software testing run for our WorkSync platform ahead of our executive presentation. 

Target URL: https://work-sync-six.vercel.app/

Please follow the 10 testing suites in the attached QA checklist. For each test case, verify that the expected behavior matches the actual behavior, note response times, and test both happy paths and edge cases (e.g. invalid inputs, password mismatch).

If you encounter any bug or unexpected behavior:
1. Log it using the Bug Report Template at the bottom of the document.
2. Note the step number, browser used, and a screenshot.
3. Classify severity: Critical (blocks workflow), High, Medium, or Low.

Please complete this checklist and report your sign-off status once done. Thank you!
```

---

## 🧪 Comprehensive QA Test Suites

---

### Test Suite 1: User Registration & Authentication

| Test ID | Test Case | Action Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Standard Registration | Navigate to `/register`. Enter Name, valid Email (`testqa_<timestamp>@domain.com`), Password (`Password123!`), Confirm Password (`Password123!`). Click **Create Account**. | Successfully registers, redirects to `/dashboard`, displays welcome toast, and stores JWT in `localStorage`. | [ ] PASS<br>[ ] FAIL |
| **AUTH-02** | Password Mismatch Validation | On `/register`, enter Password `Password123!` and Confirm Password `Password456!`. Click **Create Account**. | Form displays error: *"Passwords do not match"*. Request is blocked before submission. | [ ] PASS<br>[ ] FAIL |
| **AUTH-03** | Short Password Validation | On `/register`, enter password with less than 6 characters (`abc`). | Form displays error: *"Password must be at least 6 characters"*. | [ ] PASS<br>[ ] FAIL |
| **AUTH-04** | Duplicate Email Handling | Try to register with an email that is already registered. | Backend returns HTTP 400 with message: *"An account with this email already exists"*. | [ ] PASS<br>[ ] FAIL |
| **AUTH-05** | Standard User Login | Navigate to `/login`. Enter the email and password registered in `AUTH-01`. Click **Sign In**. | Authenticates successfully, redirects to `/dashboard`, user profile loads in top navbar. | [ ] PASS<br>[ ] FAIL |
| **AUTH-06** | Invalid Login Credentials | On `/login`, enter valid email with an incorrect password. Click **Sign In**. | Displays clear error: *"Invalid email or password"*. User remains on `/login`. | [ ] PASS<br>[ ] FAIL |
| **AUTH-07** | Logout & Session Clearing | Click profile menu in top-right or sidebar ➔ Click **Sign Out**. | Session cleared, user redirected to `/login`. Trying to navigate directly to `/dashboard` redirects back to `/login`. | [ ] PASS<br>[ ] FAIL |

---

### Test Suite 2: 1-Click Instant Demo Mode

| Test ID | Test Case | Action Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DEMO-01** | Instant Demo Access | Open `/login` in Incognito / Private window. In the purple "Want to test immediately?" box, click **Instant Demo Login**. | Instantly provisions `demo@worksync.io` ("Alex Rivera") and navigates to `/dashboard` without manual credentials. | [ ] PASS<br>[ ] FAIL |
| **DEMO-02** | Pre-seeded Workflows | In Demo Mode, click **Workflows** in the sidebar. | Displays 4 pre-seeded workflows: `Email to Slack Notification`, `Form Responses to Discord Alerts`, `Webhook Ingestion to Sheets`, `Weekly Backup to Teams`. | [ ] PASS<br>[ ] FAIL |
| **DEMO-03** | Pre-seeded Analytics | In Demo Mode, view the Dashboard metrics and charts. | Shows populated metrics (Total Workflows: 4, Active: 3, Inactive: 1), 7-day activity graph, and recent executions. | [ ] PASS<br>[ ] FAIL |

---

### Test Suite 3: Dashboard & Real-Time Analytics

| Test ID | Test Case | Action Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DASH-01** | Metric Cards Accuracy | On `/dashboard`, verify metric counters: *Total Workflows*, *Active Workflows*, *Total Executions*, *Success Rate*. | Numbers match the underlying database records without NaN or undefined labels. | [ ] PASS<br>[ ] FAIL |
| **DASH-02** | 7-Day Activity Chart | Verify chart component renders past 7 days (Mon-Sun). Hover over bars/points. | Tooltip shows exact execution count and success/failed ratio for each day. | [ ] PASS<br>[ ] FAIL |
| **DASH-03** | Quick Action Shortcuts | Click **New Workflow** button from the top dashboard header. | Navigates immediately to `/workflows/create` (Workflow Builder). | [ ] PASS<br>[ ] FAIL |
| **DASH-04** | Recent Activity Feed | Review the "Recent Executions" table on `/dashboard`. Click any execution item. | Displays trigger details, execution status badge (`success`/`failed`), duration (ms), and timestamp. | [ ] PASS<br>[ ] FAIL |

---

### Test Suite 4: Workflow Pipeline Builder & CRUD

| Test ID | Test Case | Action Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **WF-01** | Create New Workflow | Go to `/workflows/create`. Enter: Name: `Lead Alert Pipeline`, Description: `Send Slack alert when lead arrives`. | Builder loads visual step cards for Trigger, Condition, and Action. | [ ] PASS<br>[ ] FAIL |
| **WF-02** | Configure Trigger | Select App: **Webhooks**, Event: **Catch Webhook**, Parameters: `eventName: lead.created`. | Step badge confirms configuration. Generated Webhook URL displays with unique ID. | [ ] PASS<br>[ ] FAIL |
| **WF-03** | Configure Conditional Logic | Click **Add Condition**. Select Field: `trigger.score`, Operator: `greater_than`, Value: `50`. | Rule persists in the workflow visual flow. | [ ] PASS<br>[ ] FAIL |
| **WF-04** | Configure Action | Select App: **Slack**, Action: **Send Channel Message**, Parameters: Channel: `#sales-alerts`, Message: `New hot lead: {{trigger.email}} with score {{trigger.score}}`. | Variable tags highlight correctly in the message template preview. | [ ] PASS<br>[ ] FAIL |
| **WF-05** | Save Workflow | Click **Save Workflow** button at top right. | Saves successfully, displays confirmation banner, and redirects to `/workflows` where the new workflow is listed. | [ ] PASS<br>[ ] FAIL |
| **WF-06** | Toggle Active / Inactive | On `/workflows`, locate any active workflow. Click the green toggle switch to turn it OFF. | Switch flips to gray (Inactive). Badge updates immediately. Background scheduler unregisters job. Flip it back ON. | [ ] PASS<br>[ ] FAIL |
| **WF-07** | Duplicate Workflow | On `/workflows`, click the three-dots menu on a workflow ➔ Click **Duplicate**. | Clones the workflow with title `[Workflow Name] (Copy)`. All trigger/action steps are retained. | [ ] PASS<br>[ ] FAIL |
| **WF-08** | Delete Workflow | On `/workflows`, click the three-dots menu ➔ Click **Delete** ➔ Confirm deletion dialog. | Workflow is removed from database and UI without orphaned executions. | [ ] PASS<br>[ ] FAIL |

---

### Test Suite 5: Execution Engine & Simulation Testing

| Test ID | Test Case | Action Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **EXEC-01** | Simulate Workflow Execution | In the Workflow Builder or details page, click **Test Workflow Simulation**. In the modal, provide test JSON payload: `{"score": 85, "email": "lead@enterprise.com"}`. Click **Execute Test**. | Modal displays real-time execution lifecycle (`queued` ➔ `running` ➔ `success`). | [ ] PASS<br>[ ] FAIL |
| **EXEC-02** | Condition Passing Check | Run simulation where condition is met (`score: 85 > 50`). | Step log shows: `Condition: Evaluated - Passed rule (score > 50)`. Action runs and succeeds. | [ ] PASS<br>[ ] FAIL |
| **EXEC-03** | Condition Failing Check | Run simulation where condition fails (`score: 20 < 50`). | Step log shows: `Condition: Evaluated - Skipped (score 20 does not exceed 50)`. Action is gracefully skipped. | [ ] PASS<br>[ ] FAIL |
| **EXEC-04** | Execution Logs Audit Trail | Check the execution logs drawer. Verify the 3 step cards: Trigger, Condition, Action. | Each step displays status icon, duration (ms), input payload, output payload, and exact timestamps. | [ ] PASS<br>[ ] FAIL |

---

### Test Suite 6: Public Inbound Webhook Ingestion

| Test ID | Test Case | Action Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **WH-01** | External Webhook Trigger | Copy the webhook URL from a Webhook workflow (e.g. `https://work-sync-six.vercel.app/api/workflows/webhook/wh_...`). Send a POST request via cURL, Postman, or terminal: `curl -i -X POST <URL> -H "Content-Type: application/json" -d '{"event":"signup","user":"Tester"}'`. | Server responds with `HTTP 202 Accepted` and JSON `{"success": true, "message": "Queued 1 workflow execution(s)"}`. | [ ] PASS<br>[ ] FAIL |
| **WH-02** | History Reflection | After executing `WH-01`, refresh `/history` in WorkSync UI. | New execution record appears at the top of Task History with status `success` or `running` and matching payload. | [ ] PASS<br>[ ] FAIL |
| **WH-03** | Rate Limiting Check | Rapidly fire 70 POST requests within 1 minute to the webhook endpoint. | Rate limiter triggers after 60 requests with `HTTP 429 Too Many Requests: Webhook rate limit exceeded`. | [ ] PASS<br>[ ] FAIL |

---

### Test Suite 7: Apps & Integrations Catalog

| Test ID | Test Case | Action Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **APPS-01** | Catalog Display | Navigate to `/apps`. | Displays 10 integration cards: Slack, Gmail, Google Sheets, Google Forms, Discord, Microsoft Teams, Webhooks, GitHub, Notion, Schedule. | [ ] PASS<br>[ ] FAIL |
| **APPS-02** | Webhook App Connect (Slack) | Find **Slack** ➔ Click **Connect**. Enter a valid webhook format (`https://hooks.slack.com/services/T00/B00/XXXX`) ➔ Click **Authorize & Connect**. | Badge turns green (**Connected**). Modal closes. Webhook URL is encrypted via AES-256-GCM. | [ ] PASS<br>[ ] FAIL |
| **APPS-03** | Malicious Webhook Host Rejection | In Slack connect modal, try entering an arbitrary URL like `https://malicious-site.com/steal`. | Validation catches SSRF attempt and returns error: *"Invalid Slack webhook URL host"*. | [ ] PASS<br>[ ] FAIL |
| **APPS-04** | Disconnect App | On any connected app (e.g. Slack), click **Disconnect** ➔ Confirm. | Status badge returns to gray (**Not Connected**). Credentials cleanly removed from database. | [ ] PASS<br>[ ] FAIL |
| **APPS-05** | Google OAuth Redirect | Find **Gmail** or **Google Sheets** ➔ Click **Connect**. | Directs browser to `accounts.google.com/o/oauth2/v2/auth`. Consent screen shows WorkSync branding. | [ ] PASS<br>[ ] FAIL |

---

### Test Suite 8: Task History & Observability

| Test ID | Test Case | Action Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **HIST-01** | Paginated History | Navigate to `/history`. | Lists past executions with Workflow Name, Trigger App icon, Status badge, Duration (ms), and Execution Date. | [ ] PASS<br>[ ] FAIL |
| **HIST-02** | Status Filter | Use filter dropdown to select **Success Only**, then **Failed Only**. | Table filters dynamically to only show executions matching the selected status. | [ ] PASS<br>[ ] FAIL |
| **HIST-03** | Execution Details Modal | Click on any execution row. | Slide-over drawer opens showing raw trigger payload, action payload, and timestamped step logs. | [ ] PASS<br>[ ] FAIL |

---

### Test Suite 9: User Settings & Account Customization

| Test ID | Test Case | Action Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SET-01** | Profile Name Update | Navigate to `/settings`. Change Name to `QA Lead Engineer` ➔ Click **Save Changes**. | Success toast displays. Navbar updates profile name immediately. | [ ] PASS<br>[ ] FAIL |
| **SET-02** | Preference Toggles | In `/settings`, toggle **Email Notifications** and **Auto-retry Failed Jobs** ➔ Click **Save Preferences**. | Preferences persist after refreshing the browser page. | [ ] PASS<br>[ ] FAIL |
| **SET-03** | Webhook API Key Copy | In `/settings`, locate the **Personal Webhook Key** section (`ws_...`). Click the **Copy** button. | API key copied to clipboard. Confirmation tooltip displays *"Copied!"*. | [ ] PASS<br>[ ] FAIL |

---

### Test Suite 10: Responsiveness & Cross-Browser Verification

| Test ID | Test Case | Action Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **RESP-01** | Mobile Screen (375px) | Inspect element ➔ Toggle device toolbar (iPhone / Android 375x667). | Hamburger menu appears, navigation sidebar collapses cleanly, metric cards stack vertically without horizontal scrollbar. | [ ] PASS<br>[ ] FAIL |
| **RESP-02** | Tablet Screen (768px) | View dashboard and workflow builder on iPad viewport (768px width). | Layout adapts cleanly with 2-column grid. | [ ] PASS<br>[ ] FAIL |
| **RESP-03** | Cross-Browser Compatibility | Open `https://work-sync-six.vercel.app/` on Google Chrome, Mozilla Firefox, and Apple Safari / Microsoft Edge. | All fonts, buttons, glassmorphic styling, and animations render consistently without CSS distortions. | [ ] PASS<br>[ ] FAIL |

---

## 🐞 Bug Reporting Template (For Tester)

If any test case fails, copy and paste this template:

```markdown
### [BUG] Short descriptive title

- **Test ID:** (e.g. WF-05 or APPS-02)
- **Severity:** [Critical / High / Medium / Low]
- **Environment:** Production (https://work-sync-six.vercel.app/)
- **Browser & OS:** (e.g. Chrome 129 on Windows 11 / macOS)

**Steps to Reproduce:**
1. Navigate to ...
2. Click on ...
3. Enter ...
4. Click Submit

**Expected Result:**
What should happen according to the test case specification.

**Actual Result:**
What actually happened (include exact error message if any).

**Screenshots / Console Errors:**
(Attach screenshot or paste console error log from F12 Developer Tools).
```
