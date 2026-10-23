/**
 * Helper function to convert schedule frequency to cron pattern
 */
export const scheduleFrequencyToCron = (frequency: string): string => {
  switch (frequency) {
    case 'every_15_mins':
      return '*/15 * * * *'; // Every 15 minutes
    case 'every_hour':
      return '0 * * * *'; // Every hour at minute 0
    case 'every_day':
      return '0 9 * * *'; // Every day at 9:00 AM
    case 'every_week':
      return '0 9 * * 1'; // Every Monday at 9:00 AM
    case 'every_month':
      return '0 9 1 * *'; // First day of every month at 9:00 AM
    default:
      return '0 * * * *'; // Default to hourly
  }
};
