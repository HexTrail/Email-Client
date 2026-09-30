# PhoneMail

## Clone and Run

The quickest way to run PhoneMail on Windows is with Docker Compose. Install Git and Docker Desktop first, and make sure Docker Desktop is running.

1. Clone the repository and enter the project directory:

    ```powershell
    git clone https://github.com/HexTrail/Email-Client.git
    cd Email-Client
    ```

2. Create the backend environment file and open it for editing:

    ```powershell
    Copy-Item .env.example server/.env
    notepad server/.env
    ```

    Set `FRONTEND_URI=http://localhost:3000` and a long, unique `JWT_SECRET`. For live IVR calls, set `TWILIO_AUTH_TOKEN` so the backend can verify Twilio's webhook signature. To use phone sign-in and password recovery, also set `TWILIO_ACCOUNT_SID` and `TWILIO_VERIFY_SERVICE_SID`. These values come from your Twilio account. During development, set `DEV_OTP_BYPASS=true` to sign in without sending or entering an OTP; set it back to `false` to restore normal verification. After changing the value, apply it with `docker compose up -d backend`. The bypass is ignored when `NODE_ENV=production`. The Compose file supplies MongoDB and SMTP connection settings. The `server/.env` file must exist before Compose starts.

3. Build and start the services:

    ```powershell
    docker compose up --build -d
    ```

4. Open [http://localhost:3000](http://localhost:3000) and sign in or create an account. SMS verification requires the Twilio Verify values and, on trial accounts, an allowed recipient number. For local testing without Twilio, use the development-only `DEV_OTP_BYPASS` setting described above.

5. To get the IVR tunnel URL, follow its logs:

    ```powershell
    docker compose logs -f ivr-tunnel
    ```

    Wait until the log shows `Registered tunnel connection`, then copy the `https://...trycloudflare.com` URL and press `Ctrl+C` to stop following logs. The containers continue running. Configure the Twilio number's **A call comes in** webhook with that URL plus `/voice/incoming`, using `HTTP POST`; see [IVR Setup in Compose](#ivr-setup-in-compose) for the exact Console steps. Cloudflare can print a URL before the tunnel is connected; don't use it until the connection is registered.

6. To inspect backend logs, run `docker compose logs -f backend` in another terminal. To stop the stack, run `docker compose down`. MongoDB data remains in the `mongo-data` volume; `docker compose down -v` also deletes that data.

The Compose stack exposes the client at port `3000`, the API at `5000`, SMTP at `2525`, and MongoDB at `27018`. Phone verification and optional IVR confirmation SMS require Twilio credentials.

PhoneMail is an in-development email client that uses phone numbers as account identifiers and groups mail into conversations. The repository includes a React/TypeScript client, an Express API, MongoDB persistence, Twilio phone verification, and a local SMTP delivery path.

## Capabilities

| Capability | Status |
| --- | --- |
| Phone-based sign-in/account creation with password | Implemented |
| SMS one-time-code verification and password recovery | Implemented; requires Twilio Verify credentials |
| HTTP-only JWT session cookie and protected API routes | Implemented |
| IVR account creation through a Twilio voice webhook | Implemented |
| Compose and send formatted mail with attachments to local-domain addresses | Implemented through local SMTP |
| Reply and forward with quoted message context and attachments | Implemented in conversation view |
| CC/BCC composition, delivery, and BCC recipient redaction | Implemented |
| RFC-threaded replies with In-Reply-To and References headers | Implemented |
| Autosaved, editable, and discardable drafts | Implemented |
| Conversation list, full message history, and message attachments | Implemented |
| Per-user Conversations, Sent, Drafts, Archive, Spam, and Trash folders | Implemented |
| Per-message read/unread state and bulk archive/read/trash/restore | Implemented |
| Incoming spam classification | Basic content heuristic; not a replacement for a dedicated spam service |
| Full-message search with sender, recipient, date, unread, and attachment filters | Implemented across mail folders and drafts |
| Redis caching and end-to-end encryption | Planned; not implemented |

## Architecture

The browser sends `/api` requests to Express. The API handles identity and authorization. For mail submission, it passes the message to Nodemailer, which connects to the local SMTP listener. SMTP parses the message and persists it to MongoDB.

```mermaid
flowchart LR
    Browser[React client]
    Proxy[Vite proxy or Nginx]
    API[Express API]
    Auth[JWT cookie middleware]
    Mongo[(MongoDB)]
    Twilio[Twilio Verify and Voice]
    Mailer[Nodemailer]
    SMTP[Local SMTP server]

    Browser -->|/api requests| Proxy
    Proxy --> API
    API --> Auth
    Auth --> Mongo
    API <-->|OTP requests and IVR webhooks| Twilio
    API --> Mailer
    Mailer -->|SMTP port 2525| SMTP
    SMTP --> Mongo
```

### Account Verification Flow

```mermaid
sequenceDiagram
    actor User
    participant Client as React client
    participant API as Express API
    participant DB as MongoDB
    participant Verify as Twilio Verify

    User->>Client: Submit phone, username, and password
    Client->>API: POST /api/auth/signin
    API->>DB: Find or create account, then save password hash
    API->>Verify: Request SMS code
    Verify-->>User: Deliver one-time code
    API-->>Client: Verification requested
    User->>Client: Enter code
    Client->>API: POST /api/auth/verify-otp
    API->>Verify: Check code
    Verify-->>API: Approved or rejected
    alt Code approved
        API->>DB: Set phoneVerified to true
        API-->>Client: Set HTTP-only JWT cookie and return profile
    else Code rejected
        API-->>Client: Return verification error
    end
```

### Message Delivery and Conversation Listing

```mermaid
sequenceDiagram
    actor User
    participant Client as React client
    participant API as Express API
    participant Mailer as Nodemailer
    participant SMTP as Local SMTP listener
    participant DB as MongoDB

    User->>Client: Compose recipient, subject, and text
    Client->>API: POST /api/send-email with session cookie
    API->>API: Verify session and derive sender from token
    API->>Mailer: Send using configured SMTP host
    Mailer->>SMTP: Submit SMTP envelope and message data
    SMTP->>SMTP: Check local domain and parse message
    SMTP->>SMTP: Apply basic spam heuristic for each recipient
    SMTP->>DB: Find or create conversation, insert message and recipient folder state, and update summary
    SMTP-->>Mailer: Accept or reject
    Mailer-->>API: Delivery result
    API-->>Client: Return success or error
    Client->>API: GET /api/conversations?folder=conversations with session cookie
    API->>DB: Find conversations with messages visible in the user's folder
    API-->>Client: Return conversation summaries
    Client->>API: GET /api/conversations/:id/messages?folder=conversations
    API->>DB: Return ordered messages visible to the user
    User->>Client: Move a message to Spam or Trash, or restore it
    Client->>API: PATCH /api/messages/:id/folder
    API->>DB: Update only the authenticated user's message copy
```

The `folder` query accepts `conversations`, `spam`, or `trash`. Conversations includes received messages in the recipient's `inbox` state and the user's sent copy. Folder state is per recipient, so moving a received message does not change another recipient's view. Restoring a received message returns it to Conversations; restoring the sender's copy returns it to the Conversations view in its `sent` state. Trash is reversible and does not permanently delete messages.

Incoming SMTP messages are scored using three simple signals: suspicious subject phrases, suspicious message-content phrases, and three or more URLs. A message is automatically placed in Spam when at least two signals match. This heuristic is intentionally basic and can produce false positives or miss spam.

## Database Models

The Mongoose models are defined in `server/src/Models/`. `Message` references `Conversation` by MongoDB ObjectId. User participation is stored as phone strings rather than references to `User` documents; there is no automatic cascade when a user changes or is removed.

```mermaid
erDiagram
    USER {
        ObjectId _id
        string phone
        string username
        boolean phoneVerified
        string password
    }
    CONVERSATION ||--o{ MESSAGE : contains
    CONVERSATION {
        ObjectId _id
        string[] participants
        boolean isGroup
        string groupName
        string participantsKey
        date lastMessageAt
        string lastMessagePreview
        string lastMessageFrom
    }
    MESSAGE {
        ObjectId _id
        ObjectId conversation
        string from
        string[] to
        string[] cc
        string subject
        string text
        string html
        date date
        map recipientState
        object senderState
        ObjectId repliedTo
    }
```

### User

`User` stores a required phone string, `username`, `phoneVerified`, and an optional `password`. Sign-in and recovery accept a 10-digit national number and use the default `+91` country code for Twilio verification; mailbox addresses omit that country code. Keeping phone as a string preserves formatting and leading zeroes. Passwords set through the auth flow are bcrypt hashes; IVR-created users may not have a password yet. The database field is named `password`, though it contains the hash.

### Conversation

`Conversation` stores participant phone identifiers and whether the thread is a group. For one-to-one mail, the SMTP persistence path sorts participant identifiers and joins them into `participantsKey`; a partial unique index prevents duplicate one-to-one conversations. Messages to multiple recipients create a new group conversation rather than reusing an existing group. `lastMessageAt`, `lastMessagePreview`, and `lastMessageFrom` are denormalized for list rendering. Indexes support participant lookup by most recent activity.

### Message

`Message` references one conversation and stores sender/recipient addresses, subject, text/HTML bodies, attachment content and metadata, and dates. `recipientState` defines per-recipient read, favorite, and folder values (`inbox`, `spam`, or `trash`); `senderState` defines the sender's `sent`, `drafts`, or `trash` state. SMTP initializes recipient folder state, including the result of spam classification. Folder changes update only the authenticated user's copy. Older records without explicit recipient state are treated as inbox messages. Reply-chain fields connect a reply to its parent and mark whether the original has been answered.

Trash is a reversible folder rather than permanent deletion. No database migration, cascading delete, or retention policy is configured.

## HTTP API

Routes are mounted under `/api` unless the path begins with `/voice`. Protected routes require the `token` cookie issued after successful OTP verification.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signin` | Public | Create/continue sign-in and request a code |
| `POST` | `/api/auth/verify-otp` | Public | Verify code, mark phone verified, issue session cookie |
| `POST` | `/api/auth/forgot-password` | Public | Request recovery code without revealing account existence |
| `POST` | `/api/auth/reset-password` | Public | Verify recovery code and replace password hash |
| `GET` | `/api/user` | Session | Return current user's profile |
| `POST` | `/api/signout` | Session | Clear session cookie |
| `POST` | `/api/send-email` | Session | Send plain-text mail through local SMTP |
| `GET` | `/api/emails` | Session | List messages addressed to the current user's generated address |
| `GET` | `/api/conversations` | Session | List visible conversation summaries; optional `folder` is `conversations`, `spam`, or `trash` |
| `GET` | `/api/conversations/:conversationId/messages?folder=...` | Session | List ordered messages visible in the selected folder |
| `PATCH` | `/api/messages/:messageId/folder` | Session | Move a message to `inbox`, `spam`, or `trash`, or use `restore` |
| `POST` | `/voice/incoming` | Twilio webhook | Return IVR menu as TwiML |
| `POST` | `/voice/menu` | Twilio webhook | Process IVR selection and create account |

`POST /api/send-email` accepts `to` as a string or an array of strings, plus string `subject` and `text`. SMTP accepts only sender and recipient addresses at the configured `DOMAIN`, which defaults to `phonemail.test`.

Folder routes verify that the authenticated user owns the message as a recipient or sender. Only received messages can be marked as spam. The `restore` action returns received mail to `inbox` and sent mail to `sent`.

## Requirements and Configuration

- Node.js 20 or newer and npm
- Docker Desktop with Compose for the containerized stack, or MongoDB for local backend development
- Twilio Verify credentials for SMS sign-in and recovery
- Twilio account credentials for signed IVR webhooks and SMS verification; a sender number is optional for IVR confirmation SMS

The backend loads configuration from `server/.env`. The root `.env.example` lists available variables. Copy it to `server/.env`, provide the values needed for your setup, and never commit real secrets.

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection; Compose overrides this to use its `mongo` service |
| `FRONTEND_URI` | Credentialed CORS origin; Compose default is `http://localhost:3000`, local Vite uses `http://localhost:5173` |
| `JWT_SECRET` | Secret used to sign session tokens; use a long random value |
| `PORT` or `API_PORT` | Express port; defaults to `5000` |
| `DOMAIN` | Accepted local email domain; defaults to `phonemail.test` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Twilio credentials; the Auth Token is used to verify signed voice webhooks |
| `TWILIO_VERIFY_SERVICE_SID` | Verify service for sign-in and recovery codes |
| `TWILIO_FROM_NUMBER` | Optional sender number for IVR confirmation SMS |

The receiving Twilio phone number is configured in the Twilio Console, not in `server/.env`. Set its **A call comes in** Voice webhook to the tunnel URL plus `/voice/incoming`. `TWILIO_FROM_NUMBER` is only for optional outgoing confirmation SMS; the IVR identifies the caller from Twilio's request and uses that caller's phone number for the account.

Compose requires `server/.env` to exist. It exposes MongoDB on host port `27018`, the API on `5000`, and the frontend on `3000`. SMTP is private to the backend container and is not published as a host port. The `ivr-tunnel` service starts a temporary public Cloudflare Quick Tunnel and prints its URL in that container's logs. No purchased domain, separate tunnel account, or separate tunnel installation is needed. Testers paste the printed webhook URL into the Twilio Console once per tunnel start.

SMTP requires STARTTLS, but not SMTP AUTH: the listener binds only to `127.0.0.1` inside the backend container, and no Docker port is published. The API authenticates users before accepting send requests; the private SMTP hop is not reachable from the frontend or other containers. A temporary localhost certificate is generated and trusted by the internal mailer, so local setup needs no SMTP credentials or certificate files.

### IVR Setup in Compose

Twilio cannot call `localhost`, so Compose starts a separate `ivr-tunnel` container. It provides a temporary public HTTPS URL and prints it in the tunnel container's logs. It does not change Twilio settings automatically.

1. Copy `.env.example` to `server/.env` and set `JWT_SECRET`, `TWILIO_ACCOUNT_SID`, and `TWILIO_AUTH_TOKEN`. Set `TWILIO_VERIFY_SERVICE_SID` too if testers will sign in to the client after creating an account by phone.
2. From the repository root, start the stack:

    ```powershell
    docker compose up --build
    ```

3. Run `docker compose logs -f ivr-tunnel`. Wait for `Registered tunnel connection`, then copy the HTTPS URL printed by Cloudflare.
4. In the [Twilio Console](https://console.twilio.com/), open **Phone Numbers > Manage > Active Numbers** and click the Voice-capable number that callers will dial. On its configuration page, find **Voice Configuration** and set **A call comes in** to **Webhook**. Paste the Cloudflare URL followed by `/voice/incoming` (for example, `https://example.trycloudflare.com/voice/incoming`), select **HTTP POST**, then save the configuration.
5. Call the Twilio number from a mobile phone and press `1` when prompted. Twilio sends the caller's number to PhoneMail, which creates the account for that caller and reads the generated mailbox address aloud.

Keep the Compose stack running while testing; stopping it makes that URL unavailable. The URL can change after a restart, so copy the new URL into the Twilio Console again. Cloudflare Quick Tunnels require an internet connection and are intended for development/testing, not production hosting.

The IVR call creates a phone-only account and reads the generated mailbox address. To use that mailbox in the client, sign in with the same phone number, choose a username and password, and complete phone verification. That verification step requires working Twilio Verify settings. The IVR confirmation SMS is optional and additionally requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`.

## Run Locally

Install dependencies from the repository root:

```powershell
cd client
npm install
cd ..\server
npm install
```

Configure `server/.env` with a reachable `MONGO_URI`, `FRONTEND_URI=http://localhost:5173`, and `JWT_SECRET`. Add Twilio settings to enable verification. Start backend and client in separate terminals:

```powershell
cd server
node src/index.js
```

```powershell
cd client
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to `http://localhost:5000`. The Twilio voice webhook is served directly by Express on `/voice`; it is not a browser client route. The backend starts MongoDB, SMTP, and Express in one process; do not start `smtp-server.js` separately when using `index.js`.

## Tests and IVR Smoke Test

### Automated Checks

Run backend tests from `server/`:

```powershell
npm test
```

Run client checks from `client/`:

```powershell
npm run build
npm run lint
```

Backend tests use Node's built-in test runner and cover auth/OTP behavior, IVR responses and signature rejection, phone-string preservation, middleware, SMTP delivery, and matching IVR/mailbox domains. They use test doubles and do not require live MongoDB, Twilio credentials, a Twilio number, or a tunnel. Client build and lint checks also run without a live Twilio call.

### Live IVR Requirements

A real-call test through Docker Compose additionally requires:

- A running Docker Compose stack and internet access for the `ivr-tunnel` Cloudflare Quick Tunnel container. The host network must allow outbound Cloudflare Tunnel traffic on port `7844` (UDP for QUIC or TCP for HTTP/2).
- `TWILIO_AUTH_TOKEN` in `server/.env` so the backend can verify Twilio's signed webhook requests.
- A Voice-capable Twilio number with its **A call comes in** webhook set to the URL printed by Compose, using `HTTP POST`.
- A caller able to reach the Twilio number. Trial-account restrictions may affect outbound SMS or Verify delivery during the later client sign-in step.

Twilio Verify credentials are only needed to complete sign-in to the web client after the IVR creates the account. IVR confirmation SMS is also optional. A successful request to `http://localhost:5000/voice/incoming` only checks local routing; it does not test the public tunnel or a real call.

## Security and Operational Boundaries

- Passwords are bcrypt-hashed. JWTs are issued in an HTTP-only cookie, marked `secure` in production, with `sameSite: strict`.
- The local SMTP server permits unauthenticated connections, disables STARTTLS, and only checks that envelope addresses use the configured domain. It is not safe to expose to an untrusted network or use as a production mail server.
- Voice webhook requests are checked using Twilio's request signature. The Quick Tunnel still exposes the local API on a temporary public URL, so use it only for controlled development/testing.
- Message bodies pass through the server and are stored in MongoDB as plaintext. End-to-end encryption is not implemented.
- Full thread retrieval, folder mutations, attachment upload, search, and spam handling are not complete API workflows.
- Docker Compose is a development environment, not a production deployment configuration.

## Repository Layout

```text
client/                   React, TypeScript, and Vite application
  src/Context/             Authentication state and API calls
  src/components/home/     Mail interface components
  src/pages/               Sign-in, verification, recovery, and home pages
server/
  src/Models/              Mongoose schemas
  src/Middleware/          JWT authentication middleware
  src/routes/              Auth, email, and voice routes
  src/index.js             API, MongoDB, and SMTP startup
  src/mailer.js            Nodemailer SMTP client
  src/smtp-server.js       Local SMTP receiver and persistence
  test/                    Backend tests
docker-compose.yml         Local MongoDB, API, and frontend services
