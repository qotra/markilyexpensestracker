import { Telegraf, Context, Markup } from 'telegraf';
import * as dotenv from 'dotenv';
import database from './database';
import { formatAmount, getDateRange, parseCustomDate } from './utils';

dotenv.config();

console.log('🚀 Starting Expenses Tracker Bot...');
console.log('📝 Bot token loaded:', !!process.env.BOT_TOKEN);

const bot = new Telegraf(process.env.BOT_TOKEN!);

// Categories for expenses
const CATEGORIES = [
  'Personal', 'Food', 'Family', 'Transit', 'Bills', 'Fees', 'Entertainment'
];

// User session data
interface UserSession {
  state?: string;
  pendingExpense?: {
    amount: number;
    category?: string;
  };
  customReport?: {
    startDate?: string;
    endDate?: string;
  };
}

const userSessions: { [userId: number]: UserSession } = {};

// Helper function to get main menu keyboard
const getMainMenuKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('💰 Add Balance', 'add_balance')],
    [Markup.button.callback('💸 Add Expense', 'add_expense')],
    [Markup.button.callback('📊 View Reports', 'view_reports')],
    [Markup.button.callback('💳 Check Balance', 'check_balance')]
  ]);
};

// Helper function to get categories keyboard
const getCategoriesKeyboard = () => {
  const buttons = CATEGORIES.map(category =>
    [Markup.button.callback(category, `category_${category.toLowerCase()}`)]
  );
  buttons.push([Markup.button.callback('🔙 Back to Menu', 'main_menu')]);
  return Markup.inlineKeyboard(buttons);
};

// Helper function to get reports keyboard
const getReportsKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📅 Today', 'report_today'), Markup.button.callback('📅 Yesterday', 'report_yesterday')],
    [Markup.button.callback('📅 This Week', 'report_week'), Markup.button.callback('📅 Last Week', 'report_lastweek')],
    [Markup.button.callback('📅 This Month', 'report_month'), Markup.button.callback('📅 Last Month', 'report_lastmonth')],
    [Markup.button.callback('📅 Custom Range', 'report_custom')],
    [Markup.button.callback('🔙 Back to Menu', 'main_menu')]
  ]);
};

// Start command
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  await database.createUser(userId);

  const welcomeMessage = `🎉 Welcome to your Personal Expenses Tracker Bot!

💰 Manage your balance and track your expenses
📊 Get detailed reports of your spending
🔄 Categories: Personal, Food, Family, Transit, Bills, Fees, Entertainment

Choose an option below:`;

  await ctx.reply(welcomeMessage, getMainMenuKeyboard());
});

// Main menu callback
bot.action('main_menu', async (ctx) => {
  await ctx.editMessageText('🏠 Main Menu - Choose an option:', getMainMenuKeyboard());
});

// Add balance callback
bot.action('add_balance', async (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { state: 'waiting_balance' };
  await ctx.editMessageText('💰 Please enter the amount to add to your balance (DZD):');
});

// Check balance callback
bot.action('check_balance', async (ctx) => {
  const userId = ctx.from.id;
  const user = await database.getUser(userId);

  if (!user) {
    await database.createUser(userId);
    await ctx.editMessageText('💳 Your current balance: 0.00 DZD', getMainMenuKeyboard());
  } else {
    const balanceText = user.balance >= 0 ?
      `💳 Your current balance: ${formatAmount(user.balance)}` :
      `⚠️ Your balance is negative: ${formatAmount(user.balance)}`;

    await ctx.editMessageText(balanceText, getMainMenuKeyboard());
  }
});

// Add expense callback
bot.action('add_expense', async (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { state: 'waiting_expense_amount' };
  await ctx.editMessageText('💸 Please enter the expense amount (DZD):');
});

// Category selection callbacks
CATEGORIES.forEach(category => {
  bot.action(`category_${category.toLowerCase()}`, async (ctx) => {
    const userId = ctx.from.id;
    const session = userSessions[userId];

    if (session?.pendingExpense) {
      session.pendingExpense.category = category;
      session.state = 'waiting_description';
      await ctx.editMessageText(`📝 Add a description for your ${category} expense or click Skip:`,
        Markup.inlineKeyboard([
          [Markup.button.callback('⏭️ Skip Description', 'skip_description')],
          [Markup.button.callback('🔙 Back to Menu', 'main_menu')]
        ])
      );
    }
  });
});

// Skip description callback
bot.action('skip_description', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];

  if (session?.pendingExpense?.category) {
    await processExpense(ctx, userId, session.pendingExpense.amount, session.pendingExpense.category, 'No description');
  }
});

// Reports callbacks
bot.action('view_reports', async (ctx) => {
  await ctx.editMessageText('📊 Choose a report period:', getReportsKeyboard());
});

['today', 'yesterday', 'week', 'lastweek', 'month', 'lastmonth'].forEach(period => {
  bot.action(`report_${period}`, async (ctx) => {
    await generateReport(ctx, period);
  });
});

bot.action('report_custom', async (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { state: 'waiting_custom_start_date', customReport: {} };
  await ctx.editMessageText('📅 Please enter the start date (YYYY-MM-DD or DD/MM/YYYY):');
});

// Text message handler
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  const text = ctx.message.text;

  if (!session?.state) {
    return ctx.reply('Please use the menu buttons to interact with the bot.', getMainMenuKeyboard());
  }

  switch (session.state) {
    case 'waiting_balance':
      const amount = parseFloat(text);
      if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Please enter a valid positive amount:', getMainMenuKeyboard());
      }

      let user = await database.getUser(userId);
      if (!user) {
        await database.createUser(userId);
        user = { id: userId, balance: 0 };
      }

      const newBalance = user.balance + amount;
      await database.updateBalance(userId, newBalance);

      delete userSessions[userId];
      await ctx.reply(`✅ Added ${formatAmount(amount)} to your balance!\n💳 New balance: ${formatAmount(newBalance)}`, getMainMenuKeyboard());
      break;

    case 'waiting_expense_amount':
      const expenseAmount = parseFloat(text);
      if (isNaN(expenseAmount) || expenseAmount <= 0) {
        return ctx.reply('❌ Please enter a valid positive amount:', getMainMenuKeyboard());
      }

      session.pendingExpense = { amount: expenseAmount };
      session.state = 'waiting_category';
      await ctx.reply('🏷️ Please select a category for your expense:', getCategoriesKeyboard());
      break;

    case 'waiting_description':
      if (session.pendingExpense?.category) {
        await processExpense(ctx, userId, session.pendingExpense.amount, session.pendingExpense.category, text);
      }
      break;

    case 'waiting_custom_start_date':
      const startDate = parseCustomDate(text);
      if (!startDate) {
        return ctx.reply('❌ Please enter a valid date (YYYY-MM-DD or DD/MM/YYYY):');
      }

      session.customReport!.startDate = startDate.toISOString();
      session.state = 'waiting_custom_end_date';
      await ctx.reply('📅 Please enter the end date (YYYY-MM-DD or DD/MM/YYYY):');
      break;

    case 'waiting_custom_end_date':
      const endDate = parseCustomDate(text);
      if (!endDate) {
        return ctx.reply('❌ Please enter a valid date (YYYY-MM-DD or DD/MM/YYYY):');
      }

      session.customReport!.endDate = new Date(endDate.getTime() + 24*60*60*1000 - 1).toISOString(); // End of day
      await generateCustomReport(ctx, session.customReport!.startDate!, session.customReport!.endDate!);
      delete userSessions[userId];
      break;
  }
});

// Process expense function
async function processExpense(ctx: Context, userId: number, amount: number, category: string, description: string) {
  let user = await database.getUser(userId);
  if (!user) {
    await database.createUser(userId);
    user = { id: userId, balance: 0 };
  }

  const newBalance = user.balance - amount;
  await database.updateBalance(userId, newBalance);
  await database.addExpense(userId, amount, category, description);

  const balanceText = newBalance >= 0 ?
    `💳 Remaining balance: ${formatAmount(newBalance)}` :
    `⚠️ Balance is now negative: ${formatAmount(newBalance)}`;

  await ctx.reply(
    `✅ Expense added successfully!\n💸 Amount: ${formatAmount(amount)}\n🏷️ Category: ${category}\n📝 Description: ${description}\n\n${balanceText}`,
    getMainMenuKeyboard()
  );

  delete userSessions[userId];
}

// Generate report function
async function generateReport(ctx: Context, period: string) {
  if (!ctx.from) return;
  const userId = ctx.from.id;
  const { startDate, endDate } = getDateRange(period);

  const expenses = await database.getExpenses(userId, startDate, endDate);
  const categoryTotals = await database.getExpensesByCategory(userId, startDate, endDate);

  if (expenses.length === 0) {
    await ctx.editMessageText(`📊 No expenses found for ${period.replace('last', 'last ')}.`, getReportsKeyboard());
    return;
  }

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  let reportText = `📊 **Expense Report - ${period.replace('last', 'Last ').toUpperCase()}**\n\n`;
  reportText += `💰 Total Spent: ${formatAmount(totalSpent)}\n`;
  reportText += `📝 Number of Expenses: ${expenses.length}\n\n`;

  reportText += `**📈 By Category:**\n`;
  categoryTotals.forEach(({ category, total }) => {
    reportText += `• ${category}: ${formatAmount(total)}\n`;
  });

  await ctx.editMessageText(reportText, getReportsKeyboard());
}

// Generate custom report function
async function generateCustomReport(ctx: Context, startDate: string, endDate: string) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  const expenses = await database.getExpenses(userId, startDate, endDate);
  const categoryTotals = await database.getExpensesByCategory(userId, startDate, endDate);

  if (expenses.length === 0) {
    await ctx.reply('📊 No expenses found for the selected period.', getMainMenuKeyboard());
    return;
  }

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const start = new Date(startDate).toLocaleDateString();
  const end = new Date(endDate).toLocaleDateString();

  let reportText = `📊 **Custom Report (${start} - ${end})**\n\n`;
  reportText += `💰 Total Spent: ${formatAmount(totalSpent)}\n`;
  reportText += `📝 Number of Expenses: ${expenses.length}\n\n`;

  reportText += `**📈 By Category:**\n`;
  categoryTotals.forEach(({ category, total }) => {
    reportText += `• ${category}: ${formatAmount(total)}\n`;
  });

  await ctx.reply(reportText, getMainMenuKeyboard());
}

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ An error occurred. Please try again.', getMainMenuKeyboard());
});

// Start the bot
bot.launch().then(() => {
  console.log('🤖 Expenses Tracker Bot is running!');
}).catch((error) => {
  console.error('Failed to start bot:', error);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
