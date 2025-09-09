import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';

dotenv.config();

console.log('Starting bot...');
console.log('Bot token exists:', !!process.env.BOT_TOKEN);
console.log('Bot token length:', process.env.BOT_TOKEN?.length || 0);

const bot = new Telegraf(process.env.BOT_TOKEN!);

bot.start((ctx) => {
  console.log('Received start command from user:', ctx.from.id);
  ctx.reply('Bot is working!');
});

console.log('Launching bot...');
bot.launch().then(() => {
  console.log('✅ Bot launched successfully!');
}).catch((error) => {
  console.error('❌ Failed to start bot:', error);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
