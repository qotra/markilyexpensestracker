#!/bin/bash

# Expenses Tracker Bot Setup Script

echo "🚀 Setting up Expenses Tracker Bot..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your bot token!"
    echo "   Get your token from @BotFather on Telegram"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Check if BOT_TOKEN is set
if [ -f .env ]; then
    source .env
    if [ -z "$BOT_TOKEN" ] || [ "$BOT_TOKEN" = "your_telegram_bot_token_here" ]; then
        echo ""
        echo "⚠️  WARNING: BOT_TOKEN not set in .env file"
        echo "   1. Go to @BotFather on Telegram"
        echo "   2. Create a new bot with /newbot"
        echo "   3. Copy the token to .env file"
        echo ""
    else
        echo "✅ Bot token is configured"
    fi
fi

echo ""
echo "🎯 Setup complete! Next steps:"
echo ""
echo "1. Configure your bot token in .env file (if not done)"
echo "2. Run locally: npm run dev"
echo "3. Or run with Docker: docker-compose up -d"
echo ""
echo "📱 Bot Commands:"
echo "/start - Initialize the bot"
echo "/balance - Add money to balance"
echo "/expense - Add new expense"
echo "/report [period] - Generate reports"
echo "/help - Show help"
echo ""
