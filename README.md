# My Balanced Family Finances

A modern family budgeting application built with Next.js 16 and Supabase. Track income, expenses, and savings goals with real-time sync across devices.

## Features

- **Budget Management**: Create and track monthly budgets by category
- **Family Accounts**: Multi-user support with family sharing
- **Real-time Sync**: Changes sync instantly via Supabase
- **Offline Support**: Works offline with local storage fallback
- **Mobile Responsive**: Beautiful UI on all device sizes

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + shadcn/ui
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd family-budgeting-tool
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Fill in your Supabase credentials in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
   - `NEXT_PUBLIC_APP_URL` - Your app URL (http://localhost:3000 for dev)

5. Set up the database:
   - Run the SQL in `database.sql` in your Supabase SQL Editor

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `NEXT_PUBLIC_APP_URL` | Yes | Application URL |
| `NEXT_PUBLIC_APP_NAME` | No | App display name |
| `NEXT_PUBLIC_ENABLE_REALTIME` | No | Enable realtime sync (default: true) |

## Deployment

See [Vercel Deployment Guide](#deploying-to-vercel) below.

### Deploying to Vercel

1. Push code to GitHub
2. Import project in Vercel Dashboard
3. Add environment variables in Vercel project settings
4. Update `NEXT_PUBLIC_APP_URL` to your Vercel domain
5. Add Vercel URL to Supabase Auth redirect URLs

## License

Private - All rights reserved
