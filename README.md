# 💰 Expenses Tracker Telegram Bot

A comprehensive Telegram bot for tracking your personal expenses with balance management, built with TypeScript and Telegraf.

## 🌟 Features

- **Balance Management**: Add money to your balance and track spending
- **Negative Balance Support**: Continue tracking expenses even when balance reaches zero
- **Expense Categories**: 
  - 🛍️ Personal
  - 🍔 Food  
  - 👨‍👩‍👧‍👦 Family
  - 🚌 Transit
- **Flexible Reporting**: Generate reports for:
  - Today, Yesterday
  - This week, Last week
  - This month, Last month
  - Specific dates (YYYY-MM-DD)
  - Specific months (YYYY-MM)
- **Persistent Data**: SQLite database for reliable data storage
- **Docker Support**: Easy deployment with Docker Compose

## 🚀 Quick Start

### 1. Get Bot Token
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Copy your bot token

### 2. Setup Environment
```bash
# Clone or download the project
cd expenses-tracker

# Copy environment file
cp .env.example .env

# Edit .env and add your bot token
BOT_TOKEN=your_actual_bot_token_here
```

### 3. Run with Docker Compose (Recommended)
```bash
# Build and start the bot
docker-compose up -d

# View logs
docker-compose logs -f expenses-bot
```

### 4. Run Locally (Development)
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or build and run production
npm run build
npm start
```

## 📱 Bot Commands

### Basic Commands
- `/start` - Initialize bot and show welcome message
- `/help` - Show help and usage instructions
- `/balance` - Add money to your balance
- `/expense` - Add a new expense
- `/report [period]` - Generate expense report

### Report Examples
```
/report today
/report yesterday
/report this week
/report last month
/report 2025-09-08
/report 2025-09
```

## 💡 How to Use

### Adding Balance
1. Send `/balance`
2. Enter the amount to add
3. Your new balance will be displayed

### Adding Expenses
1. Send `/expense`
2. Enter the expense amount
3. Select a category from the inline keyboard
4. Add a description or type "skip"
5. Expense is deducted from your balance

### Generating Reports
1. Send `/report` for current month
2. Or specify period: `/report last week`
3. View categorized spending and recent transactions

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)
```bash
# Start the bot
docker-compose up -d

# Stop the bot
docker-compose down

# Restart the bot
docker-compose restart

# View logs
docker-compose logs -f expenses-bot
```

### Manual Docker Run
```bash
# Build image
docker build -t expenses-tracker-bot .

# Run container
docker run -d \
  --name expenses-bot \
  -e BOT_TOKEN=your_token_here \
  -v $(pwd)/expenses.db:/app/expenses.db \
  expenses-tracker-bot
```

## 🛠️ Development

### Project Structure
```
src/
├── index.ts      # Main bot logic and handlers
├── database.ts   # SQLite database operations
└── utils.ts      # Utility functions and helpers
```

### Scripts
```bash
npm run dev       # Development with hot reload
npm run build     # Build TypeScript to JavaScript
npm start         # Start production build
npm run watch     # Development with file watching
```

## 🔧 Configuration

### Environment Variables
- `BOT_TOKEN` - Your Telegram bot token (required)

### Database
- SQLite database file: `expenses.db`
- Automatically created on first run
- Persistent storage for users, balances, and expenses

## 📊 Database Schema

### Users Table
- `id` - Telegram user ID (primary key)
- `balance` - Current balance (can be negative)
- `created_at` - Registration timestamp

### Expenses Table
- `id` - Expense ID (auto-increment)
- `user_id` - Foreign key to users table
- `amount` - Expense amount
- `category` - Expense category
- `description` - Optional description
- `created_at` - Expense timestamp

## 🚨 Troubleshooting

### Bot Not Responding
- Check if bot token is correct in `.env` file
- Ensure bot is running: `docker-compose ps`
- Check logs: `docker-compose logs expenses-bot`

### Database Issues
- Database file permissions
- Ensure `expenses.db` is writable
- Check Docker volume mounts

### Docker Issues
```bash
# Rebuild containers
docker-compose down
docker-compose up --build -d

# Clear Docker cache
docker system prune -f
```

## 🔄 Updates and Maintenance

### Backup Database
```bash
# Copy database file
cp expenses.db expenses_backup_$(date +%Y%m%d).db

# Or with Docker
docker cp expenses-tracker-bot:/app/expenses.db ./backup.db
```

### Update Bot
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up --build -d
```

## 📝 License

MIT License - feel free to use and modify as needed.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

💡 **Pro Tip**: Start a chat with your bot and send `/start` to begin tracking your expenses!
