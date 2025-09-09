import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, subWeeks, subMonths, parseISO } from 'date-fns';

export const formatCurrency = (amount: number): string => {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${amount.toFixed(2)} DZD`;
};

export const formatBalance = (balance: number): string => {
  if (balance >= 0) {
    return `💰 Balance: ${balance.toFixed(2)} DZD`;
  } else {
    return `⚠️ Debt: ${Math.abs(balance).toFixed(2)} DZD`;
  }
};

export const getDateRange = (period: string): { start: string; end: string; label: string } => {
  const now = new Date();

  switch (period.toLowerCase()) {
    case 'today':
      return {
        start: format(startOfDay(now), 'yyyy-MM-dd HH:mm:ss'),
        end: format(endOfDay(now), 'yyyy-MM-dd HH:mm:ss'),
        label: 'Today'
      };

    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return {
        start: format(startOfDay(yesterday), 'yyyy-MM-dd HH:mm:ss'),
        end: format(endOfDay(yesterday), 'yyyy-MM-dd HH:mm:ss'),
        label: 'Yesterday'
      };

    case 'this week':
    case 'week':
      return {
        start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd HH:mm:ss'),
        end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd HH:mm:ss'),
        label: 'This Week'
      };

    case 'last week':
      const lastWeek = subWeeks(now, 1);
      return {
        start: format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd HH:mm:ss'),
        end: format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd HH:mm:ss'),
        label: 'Last Week'
      };

    case 'this month':
    case 'month':
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd HH:mm:ss'),
        end: format(endOfMonth(now), 'yyyy-MM-dd HH:mm:ss'),
        label: 'This Month'
      };

    case 'last month':
      const lastMonth = subMonths(now, 1);
      return {
        start: format(startOfMonth(lastMonth), 'yyyy-MM-dd HH:mm:ss'),
        end: format(endOfMonth(lastMonth), 'yyyy-MM-dd HH:mm:ss'),
        label: 'Last Month'
      };

    default:
      // Try to parse as specific date (YYYY-MM-DD)
      try {
        const date = parseISO(period);
        return {
          start: format(startOfDay(date), 'yyyy-MM-dd HH:mm:ss'),
          end: format(endOfDay(date), 'yyyy-MM-dd HH:mm:ss'),
          label: format(date, 'MMMM d, yyyy')
        };
      } catch {
        // Try to parse as month (YYYY-MM)
        try {
          const date = parseISO(`${period}-01`);
          return {
            start: format(startOfMonth(date), 'yyyy-MM-dd HH:mm:ss'),
            end: format(endOfMonth(date), 'yyyy-MM-dd HH:mm:ss'),
            label: format(date, 'MMMM yyyy')
          };
        } catch {
          // Default to this month
          return {
            start: format(startOfMonth(now), 'yyyy-MM-dd HH:mm:ss'),
            end: format(endOfMonth(now), 'yyyy-MM-dd HH:mm:ss'),
            label: 'This Month'
          };
        }
      }
  }
};

export const getCategoryEmoji = (category: string): string => {
  const emojis: { [key: string]: string } = {
    personal: '🛍️',
    food: '🍔',
    family: '👨‍👩‍👧‍👦',
    transit: '🚌',
    bills: '📄',
    entertainments: '🎬'
  };
  return emojis[category] || '💸';
};
