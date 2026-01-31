# Witch 🧙‍♀️

A desktop app to track your followed Twitch streamers.

## Stack

- **Desktop**: Tauri + React + TanStack Router
- **Server**: Bun + tRPC + Kysely (SQLite)
- **Shared**: Types and config

## Setup

```bash
# Install dependencies
bun install

# Set environment variables
cp apps/server/.env.example apps/server/.env
# Edit .env with your Twitch credentials

# Run development
bun dev
```

## Environment Variables

Create `apps/server/.env`:

```
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
```

Get credentials at [Twitch Developer Console](https://dev.twitch.tv/console).

## Scripts

- `bun dev` - Run server and desktop in development
- `bun build` - Build for production
- `bun lint` - Check code with Biome
- `bun format` - Format code

## Structure

```
apps/
  desktop/    # Tauri + React frontend
  server/     # Bun backend with tRPC
packages/
  shared/     # Shared types and config
```
