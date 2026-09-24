# PhoneMail

PhoneMail is an email client prototype built around phone-number-based accounts. The planned experience combines a React web client with a Node.js backend, MongoDB persistence, and a local SMTP server for delivering mail between PhoneMail users.

The project is currently under active development. The sign-in page and initial backend route are present, while the full authentication flow, mailbox UI, persistence routes, and production mail delivery still need to be completed.

## Features

### Currently present

- React and TypeScript client powered by Vite.
- Sign-in form with client-side validation for a 10-digit phone number and 6-digit OTP.
- Terms of Service modal on the sign-in page.
- Express backend with CORS and JSON request handling.
- Initial `POST /auth/signin` endpoint with phone and OTP shape validation.
- Mongoose schemas for users, conversations, and messages.
- Local SMTP and Nodemailer modules designed for development mail delivery.

### Planned

- Twilio OTP generation and verification.
- JWT login sessions and protected API routes.
- Compose, inbox, sent, drafts, spam, trash, and attachment workflows.
- Conversation-based mobile chat view and group conversations.
- MongoDB and Redis integration.
- End-to-end encryption and Docker-based development.

## Tech Stack

- **Client:** React 19, TypeScript, Vite, React Router, Tailwind CSS, Axios
- **Server:** Node.js, Express, MongoDB/Mongoose
- **Authentication:** JWT, bcrypt, Twilio (planned)
- **Email:** Nodemailer, `smtp-server`, `mailparser`
- **Supporting services:** Redis (planned)

## Project Structure

```text
.
├── client/
│   ├── src/
│   │   ├── components/       # Shared React components
│   │   ├── pages/            # Sign-in and application pages
│   │   ├── App.tsx           # Client routes
│   │   └── main.tsx          # React entry point
│   └── package.json
├── server/
│   ├── src/
│   │   ├── Middleware/       # Authentication middleware
│   │   ├── Models/           # Mongoose schemas
│   │   ├── index.js          # Express API entry point
│   │   ├── mailer.js         # Nodemailer SMTP client
│   │   └── smtp-server.js    # Local SMTP server
│   └── package.json
├── notes.md                  # Development notes and task list
└── README.md
```

## Requirements

- Node.js 18 or newer
- npm
- MongoDB for the planned persistence layer
- Twilio credentials for the planned OTP flow
- Redis for the planned cache integration

The current client can be installed and started without MongoDB, Twilio, or Redis. The backend may require additional implementation and configuration before it can run as a complete service.

## Installation

Install dependencies in each application directory:

```bash
cd client
npm install

cd ../server
npm install
```

## Configuration

Create a `.env` file in `server/` when enabling the backend services. The code currently reads or expects these values:

```env
FRONTEND_URI=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
SMTP_PORT=2525
DOMAIN=phonemail.test
```

Additional values will be needed when Twilio, MongoDB, and Redis integration is implemented. Do not commit real credentials or secrets.

## Running the Project

Start the client:

```bash
cd client
npm run dev
```

The Vite development server normally runs at `http://localhost:5173`.

Start the Express API in a second terminal:

```bash
cd server
node src/index.js
```

The API is configured to listen on `http://localhost:5000`.

The SMTP module is intended to run as a separate local process:

```bash
cd server
node src/smtp-server.js
```

The local SMTP server defaults to port `2525` and accepts recipients in the configured `DOMAIN`. `mailer.js` sends outgoing messages to this local server rather than to an external provider.

## Available Client Routes

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | Phone and OTP sign-in page | Initial UI available |
| `/home` | Authenticated mail experience | Page shell only |

## API

### `POST /auth/signin`

The initial route expects JSON in this shape:

```json
{
	"phone": "9876543210",
	"otp": "123456"
}
```

The current validation requires a 10-character phone string and a 6-character OTP string. Successful authentication, token creation, and persistence are not implemented yet.

## Data Model Intent

- **User:** stores a phone number and username. Phone numbers should remain strings so leading zeroes are preserved.
- **Conversation:** groups one-to-one and group mail threads. One-to-one conversations use a sorted participant key to avoid duplicate threads.
- **Message:** stores message content, recipients, attachments, folder state, read/favorite state, and reply-chain metadata.

## Client Scripts

Run these from `client/`:

```bash
npm run dev       # Start Vite development server
npm run build     # Type-check and create a production build
npm run lint      # Run ESLint
npm run preview   # Preview the production build
```

The server package does not yet define a development or production start script; use the Node commands above until those scripts are added.

## Known Limitations

- The sign-in form currently validates input locally and does not call the API.
- The backend sign-in handler validates input but does not complete authentication or return a session.
- The home page is an empty layout shell.
- SMTP code references a storage module that is not currently present in the repository.
- The backend imports `zod`, but it is not currently listed in `server/package.json`.
- Database connection, mailbox APIs, Twilio OTP delivery, and Redis caching are not wired up yet.
- No automated test suite is configured.

## Development Notes

See [notes.md](notes.md) for the current task list, team responsibilities, and implementation notes.