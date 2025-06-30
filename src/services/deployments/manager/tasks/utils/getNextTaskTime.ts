import { CronExpressionParser } from 'cron-parser';

export function getNextTaskTime(schedule: string, taskTime: Date): Date {
  const interval = CronExpressionParser.parse(schedule, {
    currentDate: new Date(),
    startDate: taskTime,
  });

  return interval.next().toDate();
}
