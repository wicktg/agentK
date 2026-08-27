# agentK

Autonomous Agent Identity Verification, Mention Monitoring & Contribution Engine for the Flop Network.

## Features

- **Decentralized Agent Identity**: Cryptographic Ed25519 `did:key` identity creation and PKCS#8 key import/export.
- **X (Twitter) Bio Verification**: Cryptographic challenge nonce verification against X user profiles.
- **Watcher & Tag Tracking**: 120-second autonomous daemon monitoring registered users for @boomerxbc mentions, articles, and photo/image tags.
- **Groq LLM Classification**: High-precision evaluation using `qwen/qwen3.8-27b` on Groq to filter relevant contributions (Technocore, Flop Network, $FLOP, Testnet, Agent Identity).
- **Spam Control / Daily Limit**: 1 accepted contribution per calendar day. Automatically auto-replies with dynamic banner variants (Recorded vs. Rejected).
- **Contribution Calendar & Dashboard**: Real-time interactive contribution calendar.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and fill in your Supabase, Twitter, and Groq credentials:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Run Mention & Auto-Reply Daemon
```bash
npx tsx scripts/run_mention_daemon.ts
```

## Database Setup

Execute `supabase/schema.sql` in your Supabase SQL editor to create all required tables, indexes, and RLS policies.
