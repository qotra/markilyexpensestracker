# Expenses Tracker Telegram Bot

A comprehensive Telegram bot for tracking personal expenses with balance management and detailed reporting.

## Features

- 💰 **Balance Management**: Add money to your balance, track spending
- 💸 **Expense Tracking**: Record expenses with categories and descriptions
- 📊 **Detailed Reports**: View expenses by day, week, month, or custom date ranges
- 🏷️ **Categories**: Personal, Food, Family, Transit, Bills, Fees, Entertainment
- 💳 **Negative Balance Support**: Continue tracking when balance goes negative
- 🇩🇿 **DZD Currency**: All amounts displayed in Algerian Dinar

## Quick Start

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your bot token in `.env`:
   ```
   BOT_TOKEN=your_bot_token_here
   ```

4. Run in development mode:
   ```bash
   npm run dev
   ```

### Production Deployment with Docker

1. Build and run with Docker Compose:
   ```bash
   docker-compose up -d --build
   ```

2. Check logs:
   ```bash
   docker-compose logs -f
   ```

3. Stop the bot:
   ```bash
   docker-compose down
   ```

## Bot Commands

The bot uses inline keyboard buttons for all interactions:

- **💰 Add Balance** - Add money to your balance
- **💸 Add Expense** - Record a new expense
- **📊 View Reports** - Generate expense reports
- **💳 Check Balance** - View current balance

## Report Types

- **Today** - Expenses for today
- **Yesterday** - Expenses for yesterday  
- **This Week** - Expenses for current week
- **Last Week** - Expenses for previous week
- **This Month** - Expenses for current month
- **Last Month** - Expenses for previous month
- **Custom Range** - Expenses for a custom date range

## Architecture

- **TypeScript** - Type-safe development
- **Telegraf** - Telegram bot framework
- **SQLite** - Local database for data persistence
- **Docker** - Containerized deployment

## Project Structure

```
src/
├── index.ts      # Main bot logic and handlers
├── database.ts   # Database operations
└── utils.ts      # Utility functions

docker-compose.yml # Docker deployment configuration
Dockerfile        # Container build instructions
```

## Environment Variables

- `BOT_TOKEN` - Your Telegram bot token (required)

Get your bot token from [@BotFather](https://t.me/BotFather) on Telegram.
