import 'dotenv/config';
import { Telegraf, Context, Markup } from 'telegraf';
import { db, EXPENSE_CATEGORIES, ExpenseCategory } from './database';
import { formatBalance, formatCurrency, getDateRange, getCategoryEmoji } from './utils';

// Debug: Check if BOT_TOKEN is loaded
console.log('🔍 Starting bot initialization...');
console.log('🔍 BOT_TOKEN loaded:', process.env.BOT_TOKEN ? 'Yes' : 'No');
console.log('🔍 BOT_TOKEN length:', process.env.BOT_TOKEN?.length || 0);

if (!process.env.BOT_TOKEN || process.env.BOT_TOKEN === 'your_telegram_bot_token_here') {
  console.error('❌ BOT_TOKEN is not properly configured in .env file');
  console.error('Please set a valid bot token from @BotFather');
  process.exit(1);
}

interface BotContext extends Context {
  session?: {
    waitingForAmount?: boolean;
    waitingForBalance?: boolean;
    waitingForDescription?: boolean;
    waitingForCustomDate?: boolean;
    selectedCategory?: ExpenseCategory;
  };
}

const bot = new Telegraf<BotContext>(process.env.BOT_TOKEN || '');

// Store user sessions
const userSessions: { [key: number]: any } = {};

const getSession = (userId: number) => {
  if (!userSessions[userId]) {
    userSessions[userId] = {};
  }
  return userSessions[userId];
};

// Start command
bot.start(async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Ensure user exists in database
  let user = await db.getUser(userId);
  if (!user) {
    user = await db.createUser(userId);
  }

  const welcomeMessage = `
🎯 Welcome to Expenses Tracker Bot!

${formatBalance(user.balance)}

Use the buttons below to manage your expenses:
  `;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('💰 Add Balance', 'cmd_balance'),
      Markup.button.callback('💸 Add Expense', 'cmd_expense')
    ],
    [
      Markup.button.callback('📊 View Report', 'cmd_report'),
      Markup.button.callback('❓ Help', 'cmd_help')
    ]
  ]);

  await ctx.reply(welcomeMessage, keyboard);
});

// Help command
bot.help(async (ctx) => {
  const helpMessage = `
📚 **Expenses Tracker Bot Help**

**Features:**
• 💰 Add Balance - Add money to your account
• 💸 Add Expense - Track your spending  
• 📊 View Report - See expense summaries

**Categories:**
🛍️ Personal - Personal purchases
🍔 Food - Food and dining
👨‍👩‍👧‍👦 Family - Family expenses
🚌 Transit - Transportation costs
📄 Bills - Bills and utilities
🎬 Entertainments - Entertainment expenses

**Balance System:**
• Positive balance shows available money
• Negative balance tracks debt/overspending
• All expenses are automatically deducted

**Report Options:**
• Daily: Today, Yesterday
• Weekly: This Week, Last Week  
• Monthly: This Month, Last Month
• Custom Search: Specific dates or ranges
• By Category: Filter by expense type

Use /start to return to main menu anytime!
  `;

  const backKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
  ]);

  await ctx.reply(helpMessage, {
    parse_mode: 'Markdown',
    reply_markup: backKeyboard.reply_markup
  });
});

// Balance command
bot.command('balance', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = getSession(userId);
  session.waitingForBalance = true;

  await ctx.reply('💰 Enter the amount to add to your balance:', Markup.removeKeyboard());
});

// Expense command
bot.command('expense', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = getSession(userId);
  session.waitingForAmount = true;

  await ctx.reply('💸 Enter the expense amount:', Markup.removeKeyboard());
});

// Report command
bot.command('report', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const args = ctx.message.text.split(' ').slice(1);
  const period = args.join(' ') || 'this month';

  const { start, end, label } = getDateRange(period);

  const expenses = await db.getExpenses(userId, start, end);
  const categoryTotals = await db.getTotalExpensesByCategory(userId, start, end);

  if (expenses.length === 0) {
    await ctx.reply(`📊 No expenses found for ${label.toLowerCase()}.`);
    return;
  }

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  let reportMessage = `📊 **Expense Report - ${label}**\n\n`;
  reportMessage += `💰 Total Spent: ${totalAmount.toFixed(2)} DZD\n\n`;

  reportMessage += `**By Category:**\n`;
  for (const category of categoryTotals) {
    const emoji = getCategoryEmoji(category.category);
    reportMessage += `${emoji} ${category.category}: ${category.total.toFixed(2)} DZD\n`;
  }

  reportMessage += `\n**Recent Transactions:**\n`;
  const recentExpenses = expenses.slice(0, 10);

  for (const expense of recentExpenses) {
    const emoji = getCategoryEmoji(expense.category);
    const date = new Date(expense.created_at).toLocaleDateString();
    reportMessage += `${emoji} ${expense.amount.toFixed(2)} DZD - ${expense.category}`;
    if (expense.description) {
      reportMessage += ` (${expense.description})`;
    }
    reportMessage += ` - ${date}\n`;
  }

  if (expenses.length > 10) {
    reportMessage += `\n... and ${expenses.length - 10} more transactions`;
  }

  await ctx.reply(reportMessage, { parse_mode: 'Markdown' });
});

// Handle text messages
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = getSession(userId);
  const message = ctx.message.text;

  // Handle balance addition
  if (session.waitingForBalance) {
    const amount = parseFloat(message);

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Please enter a valid positive amount.');
      return;
    }

    let user = await db.getUser(userId);
    if (!user) {
      user = await db.createUser(userId);
    }

    const newBalance = user.balance + amount;
    await db.updateBalance(userId, newBalance);

    session.waitingForBalance = false;

    const mainMenuKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('💰 Add Balance', 'cmd_balance'),
        Markup.button.callback('💸 Add Expense', 'cmd_expense')
      ],
      [
        Markup.button.callback('📊 View Report', 'cmd_report'),
        Markup.button.callback('❓ Help', 'cmd_help')
      ]
    ]);

    await ctx.reply(
      `✅ Added ${formatCurrency(amount)} to your balance!\n${formatBalance(newBalance)}\n\nUse the buttons below to continue:`,
      mainMenuKeyboard
    );
    return;
  }

  // Handle expense amount
  if (session.waitingForAmount) {
    const amount = parseFloat(message);

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Please enter a valid positive amount.');
      return;
    }

    session.expenseAmount = amount;
    session.waitingForAmount = false;

    // Show all 6 categories
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🛍️ Personal', 'category_personal'),
        Markup.button.callback('🍔 Food', 'category_food')
      ],
      [
        Markup.button.callback('👨‍👩‍👧‍👦 Family', 'category_family'),
        Markup.button.callback('🚌 Transit', 'category_transit')
      ],
      [
        Markup.button.callback('📄 Bills', 'category_bills'),
        Markup.button.callback('🎬 Entertainments', 'category_entertainments')
      ]
    ]);

    await ctx.reply(`💸 Expense: ${amount.toFixed(2)} DZD\n\nSelect a category:`, keyboard);
    return;
  }

  // Handle expense description
  if (session.waitingForDescription) {
    const description = message;
    const amount = session.expenseAmount;
    const category = session.selectedCategory;

    if (!amount || !category) {
      await ctx.reply('❌ Something went wrong. Please start over with /expense');
      delete userSessions[userId];
      return;
    }

    // Deduct from balance
    let user = await db.getUser(userId);
    if (!user) {
      user = await db.createUser(userId);
    }

    const newBalance = user.balance - amount;
    await db.updateBalance(userId, newBalance);
    await db.addExpense(userId, amount, category, description);

    // Clear session
    delete userSessions[userId];

    const emoji = getCategoryEmoji(category);
    const mainMenuKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('💰 Add Balance', 'cmd_balance'),
        Markup.button.callback('💸 Add Expense', 'cmd_expense')
      ],
      [
        Markup.button.callback('📊 View Report', 'cmd_report'),
        Markup.button.callback('❓ Help', 'cmd_help')
      ]
    ]);

    await ctx.reply(
      `✅ Expense added!\n\n${emoji} ${amount.toFixed(2)} DZD - ${category}\n📝 ${description}\n\n${formatBalance(newBalance)}\n\nUse the buttons below to continue:`,
      mainMenuKeyboard
    );
    return;
  }

  // Handle custom date search input
  if (session.waitingForCustomDate) {
    const dateInput = message.trim();
    session.waitingForCustomDate = false;

    try {
      let start: string, end: string, label: string;

      // Handle date ranges (e.g., "2025-08-01 to 2025-08-31")
      if (dateInput.includes(' to ')) {
        const [startDate, endDate] = dateInput.split(' to ').map(d => d.trim());
        const startRange = getDateRange(startDate);
        const endRange = getDateRange(endDate);
        start = startRange.start;
        end = endRange.end;
        label = `${startRange.label} to ${endRange.label}`;
      } else {
        // Single date or month
        const range = getDateRange(dateInput);
        start = range.start;
        end = range.end;
        label = range.label;
      }

      const expenses = await db.getExpenses(userId, start, end);
      const categoryTotals = await db.getTotalExpensesByCategory(userId, start, end);

      if (expenses.length === 0) {
        const backKeyboard = Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Reports', 'cmd_report')]
        ]);
        await ctx.reply(`📊 No expenses found for ${label.toLowerCase()}.`, backKeyboard);
        return;
      }

      const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

      let reportMessage = `🔍 **Custom Search - ${label}**\n\n`;
      reportMessage += `💰 Total Spent: ${totalAmount.toFixed(2)} DZD\n`;
      reportMessage += `📊 Total Transactions: ${expenses.length}\n\n`;

      if (categoryTotals.length > 0) {
        reportMessage += `**By Category:**\n`;
        for (const category of categoryTotals) {
          const emoji = getCategoryEmoji(category.category);
          reportMessage += `${emoji} ${category.category}: ${category.total.toFixed(2)} DZD\n`;
        }
        reportMessage += '\n';
      }

      reportMessage += `**Transactions:**\n`;
      const displayExpenses = expenses.slice(0, 12);

      for (const expense of displayExpenses) {
        const emoji = getCategoryEmoji(expense.category);
        const date = new Date(expense.created_at).toLocaleDateString();
        reportMessage += `${emoji} ${expense.amount.toFixed(2)} DZD - ${expense.category}`;
        if (expense.description) {
          reportMessage += ` (${expense.description})`;
        }
        reportMessage += ` - ${date}\n`;
      }

      if (expenses.length > 12) {
        reportMessage += `\n... and ${expenses.length - 12} more transactions`;
      }

      const backKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Reports', 'cmd_report')]
      ]);

      await ctx.reply(reportMessage, backKeyboard);
      return;

    } catch (error) {
      await ctx.reply(
        '❌ Invalid date format. Please use:\n\n' +
        '• `2025-09-08` for specific dates\n' +
        '• `2025-09` for entire months\n' +
        '• `2025-08-01 to 2025-08-31` for date ranges\n\n' +
        'Try again with /report for report options.'
      );
      return;
    }
  }
});

// Handle category selection
bot.action(/category_(.+)/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = getSession(userId);
  const category = ctx.match[1] as ExpenseCategory;

  if (!EXPENSE_CATEGORIES.includes(category)) {
    await ctx.answerCbQuery('❌ Invalid category');
    return;
  }

  session.selectedCategory = category;
  session.waitingForDescription = true;

  const skipKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('⏭️ Skip Description', 'skip_description')]
  ]);

  await ctx.editMessageText(
    `💸 Expense: ${session.expenseAmount?.toFixed(2)} DZD\n${getCategoryEmoji(category)} Category: ${category}\n\nEnter a description or click Skip:`,
    skipKeyboard
  );
  await ctx.answerCbQuery();
});

// Button handlers for main commands
bot.action('cmd_balance', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = getSession(userId);
  session.waitingForBalance = true;

  await ctx.editMessageText('💰 Enter the amount to add to your balance (in DZD):');
  await ctx.answerCbQuery();
});

bot.action('cmd_expense', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = getSession(userId);
  session.waitingForAmount = true;

  await ctx.editMessageText('💸 Enter the expense amount (in DZD):');
  await ctx.answerCbQuery();
});

bot.action('cmd_report', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Show report options including custom search
  const reportKeyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📅 Today', 'report_today'),
      Markup.button.callback('📅 Yesterday', 'report_yesterday')
    ],
    [
      Markup.button.callback('📊 This Week', 'report_this week'),
      Markup.button.callback('📊 Last Week', 'report_last week')
    ],
    [
      Markup.button.callback('📈 This Month', 'report_this month'),
      Markup.button.callback('📈 Last Month', 'report_last month')
    ],
    [
      Markup.button.callback('🔍 Custom Search', 'custom_search'),
      Markup.button.callback('📂 By Category', 'category_search')
    ],
    [
      Markup.button.callback('🔙 Back to Menu', 'back_to_menu')
    ]
  ]);

  await ctx.editMessageText('📊 Select a report type:', reportKeyboard);
  await ctx.answerCbQuery();
});

bot.action('cmd_help', async (ctx) => {
  const helpMessage = `
📚 **Expenses Tracker Bot Help**

**Features:**
• 💰 Add Balance - Add money to your account
• 💸 Add Expense - Track your spending
• 📊 View Report - See expense summaries

**Categories:**
🛍️ Personal - Personal purchases
🍔 Food - Food and dining  
👨‍👩‍👧‍👦 Family - Family expenses
🚌 Transit - Transportation costs
📄 Bills - Bills and utilities
🎬 Entertainments - Entertainment expenses

**Balance System:**
• Positive balance shows available money
• Negative balance tracks debt/overspending
• All expenses are automatically deducted

**Report Options:**
• Daily: Today, Yesterday
• Weekly: This Week, Last Week  
• Monthly: This Month, Last Month
• Custom Search: Specific dates or ranges
• By Category: Filter by expense type

Use /start to return to main menu anytime!
  `;

  const backKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
  ]);

  await ctx.editMessageText(helpMessage, {
    parse_mode: 'Markdown',
    reply_markup: backKeyboard.reply_markup
  });
  await ctx.answerCbQuery();
});

// Handle custom search button
bot.action('custom_search', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = getSession(userId);
  session.waitingForCustomDate = true;

  await ctx.editMessageText(
    '🔍 **Custom Date Search**\n\nEnter a date or date range:\n\n**Examples:**\n• `2025-09-08` (specific date)\n• `2025-09` (entire month)\n• `2025-08-01 to 2025-08-31` (date range)\n\n**Formats:**\n• YYYY-MM-DD for specific dates\n• YYYY-MM for entire months\n• Use "to" between dates for ranges'
  );
  await ctx.answerCbQuery();
});

// Handle category search button
bot.action('category_search', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const categoryKeyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🛍️ Personal', 'search_category_personal'),
      Markup.button.callback('🍔 Food', 'search_category_food')
    ],
    [
      Markup.button.callback('👨‍👩‍👧‍👦 Family', 'search_category_family'),
      Markup.button.callback('🚌 Transit', 'search_category_transit')
    ],
    [
      Markup.button.callback('📄 Bills', 'search_category_bills'),
      Markup.button.callback('🎬 Entertainments', 'search_category_entertainments')
    ],
    [
      Markup.button.callback('🔙 Back to Reports', 'cmd_report')
    ]
  ]);

  await ctx.editMessageText('📂 **Search by Category**\n\nSelect a category to view all expenses:', categoryKeyboard);
  await ctx.answerCbQuery();
});

// Handle category search selection
bot.action(/search_category_(.+)/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const category = ctx.match[1] as ExpenseCategory;

  if (!EXPENSE_CATEGORIES.includes(category)) {
    await ctx.answerCbQuery('❌ Invalid category');
    return;
  }

  const expenses = await db.getExpenses(userId, undefined, undefined, category);

  if (expenses.length === 0) {
    const backKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Back to Reports', 'cmd_report')]
    ]);
    await ctx.editMessageText(
      `📊 No expenses found for ${getCategoryEmoji(category)} ${category}.`,
      backKeyboard
    );
    await ctx.answerCbQuery();
    return;
  }

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const emoji = getCategoryEmoji(category);

  let reportMessage = `📂 **${emoji} ${category.toUpperCase()} Expenses**\n\n`;
  reportMessage += `💰 Total Spent: ${totalAmount.toFixed(2)} DZD\n`;
  reportMessage += `📊 Total Transactions: ${expenses.length}\n\n`;

  reportMessage += `**Recent Transactions:**\n`;
  const recentExpenses = expenses.slice(0, 15);

  for (const expense of recentExpenses) {
    const date = new Date(expense.created_at).toLocaleDateString();
    reportMessage += `${emoji} ${expense.amount.toFixed(2)} DZD`;
    if (expense.description) {
      reportMessage += ` - ${expense.description}`;
    }
    reportMessage += ` (${date})\n`;
  }

  if (expenses.length > 15) {
    reportMessage += `\n... and ${expenses.length - 15} more transactions`;
  }

  const backKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back to Reports', 'cmd_report')]
  ]);

  await ctx.editMessageText(reportMessage, backKeyboard);
  await ctx.answerCbQuery();
});

// Handle skip description button
bot.action('skip_description', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = getSession(userId);
  const amount = session.expenseAmount;
  const category = session.selectedCategory;

  if (!amount || !category) {
    await ctx.editMessageText('❌ Something went wrong. Please start over with /start');
    delete userSessions[userId];
    await ctx.answerCbQuery();
    return;
  }

  // Deduct from balance
  let user = await db.getUser(userId);
  if (!user) {
    user = await db.createUser(userId);
  }

  const newBalance = user.balance - amount;
  await db.updateBalance(userId, newBalance);
  await db.addExpense(userId, amount, category, '');

  // Clear session
  delete userSessions[userId];

  const emoji = getCategoryEmoji(category);
  const backKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
  ]);

  await ctx.editMessageText(
    `✅ Expense added!\n\n${emoji} ${amount.toFixed(2)} DZD - ${category}\n\n${formatBalance(newBalance)}`,
    backKeyboard
  );
  await ctx.answerCbQuery();
});

// Handle report period buttons
bot.action(/report_(.+)/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const period = ctx.match[1];
  const { start, end, label } = getDateRange(period);

  const expenses = await db.getExpenses(userId, start, end);
  const categoryTotals = await db.getTotalExpensesByCategory(userId, start, end);

  if (expenses.length === 0) {
    const backKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
    ]);
    await ctx.editMessageText(`📊 No expenses found for ${label.toLowerCase()}.`, backKeyboard);
    await ctx.answerCbQuery();
    return;
  }

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  let reportMessage = `📊 **Expense Report - ${label}**\n\n`;
  reportMessage += `💰 Total Spent: ${totalAmount.toFixed(2)} DZD\n\n`;

  reportMessage += `**By Category:**\n`;
  for (const category of categoryTotals) {
    const emoji = getCategoryEmoji(category.category);
    reportMessage += `${emoji} ${category.category}: ${category.total.toFixed(2)} DZD\n`;
  }

  reportMessage += `\n**Recent Transactions:**\n`;
  const recentExpenses = expenses.slice(0, 10);

  for (const expense of recentExpenses) {
    const emoji = getCategoryEmoji(expense.category);
    const date = new Date(expense.created_at).toLocaleDateString();
    reportMessage += `${emoji} ${expense.amount.toFixed(2)} DZD - ${expense.category}`;
    if (expense.description) {
      reportMessage += ` (${expense.description})`;
    }
    reportMessage += ` - ${date}\n`;
  }

  if (expenses.length > 10) {
    reportMessage += `\n... and ${expenses.length - 10} more transactions`;
  }

  const backKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
  ]);

  await ctx.editMessageText(reportMessage, {
    parse_mode: 'Markdown',
    reply_markup: backKeyboard.reply_markup
  });
  await ctx.answerCbQuery();
});

// Handle back to menu button
bot.action('back_to_menu', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Clear any existing session
  delete userSessions[userId];

  let user = await db.getUser(userId);
  if (!user) {
    user = await db.createUser(userId);
  }

  const welcomeMessage = `
🎯 Welcome to Expenses Tracker Bot!

${formatBalance(user.balance)}

Use the buttons below to manage your expenses:
  `;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('💰 Add Balance', 'cmd_balance'),
      Markup.button.callback('💸 Add Expense', 'cmd_expense')
    ],
    [
      Markup.button.callback('📊 View Report', 'cmd_report'),
      Markup.button.callback('❓ Help', 'cmd_help')
    ]
  ]);

  await ctx.editMessageText(welcomeMessage, keyboard);
  await ctx.answerCbQuery();
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ Something went wrong. Please try again.');
});

// Start the bot
const startBot = async () => {
  try {
    await bot.launch();
    console.log('🚀 Expenses Tracker Bot started successfully!');
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

if (require.main === module) {
  startBot();
}

export { bot };
