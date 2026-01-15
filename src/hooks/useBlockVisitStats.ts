import { useMemo } from 'react';
import type { BlockVisit } from '@/types/farm';
import { subDays, subMonths, format, startOfDay, startOfWeek, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export interface DailyPassCount {
  date: string;
  count: number;
  label: string;
}

export interface WeeklyPassCount {
  weekStart: string;
  count: number;
  label: string;
}

export interface BlockVisitStats {
  weeklyPasses3m: WeeklyPassCount[];
  dailyPasses90d: DailyPassCount[];
  averagePassesPerMonth: number;
  totalDuration: number; // in minutes
  averageDuration: number; // in minutes
}

export function useBlockVisitStats(visits: BlockVisit[]): BlockVisitStats {
  return useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);
    const ninetyDaysAgo = subDays(now, 90);
    const oneYearAgo = subMonths(now, 12);

    // Create maps for counting by day and week
    const countByDay = new Map<string, number>();
    const countByWeek = new Map<string, number>();
    const countByMonth = new Map<string, number>();
    
    visits.forEach(visit => {
      const visitDate = new Date(visit.started_at);
      const dayKey = format(startOfDay(visitDate), 'yyyy-MM-dd');
      const weekKey = format(startOfWeek(visitDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const monthKey = format(visitDate, 'yyyy-MM');
      
      countByDay.set(dayKey, (countByDay.get(dayKey) || 0) + 1);
      countByWeek.set(weekKey, (countByWeek.get(weekKey) || 0) + 1);
      countByMonth.set(monthKey, (countByMonth.get(monthKey) || 0) + 1);
    });

    // Weekly passes for last 3 months (12 weeks)
    const weeks = eachWeekOfInterval(
      { start: threeMonthsAgo, end: now },
      { weekStartsOn: 1 }
    );
    const weeklyPasses3m: WeeklyPassCount[] = weeks.map((weekStart, idx) => {
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      return {
        weekStart: weekKey,
        count: countByWeek.get(weekKey) || 0,
        label: `S${idx + 1}`,
      };
    });

    // Daily passes for last 90 days (heatmap)
    const last90Days = eachDayOfInterval({ start: ninetyDaysAgo, end: now });
    const dailyPasses90d: DailyPassCount[] = last90Days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        date: dateKey,
        count: countByDay.get(dateKey) || 0,
        label: format(day, 'd'),
      };
    });

    // Calculate monthly average (last 12 months)
    const visitsLastYear = visits.filter(v => new Date(v.started_at) >= oneYearAgo);
    const monthsWithData = new Set(
      visitsLastYear.map(v => format(new Date(v.started_at), 'yyyy-MM'))
    ).size;
    const averagePassesPerMonth = monthsWithData > 0 
      ? visitsLastYear.length / Math.max(monthsWithData, 1)
      : 0;

    // Calculate durations
    let totalDuration = 0;
    visits.forEach(visit => {
      if (visit.ended_at) {
        const duration = new Date(visit.ended_at).getTime() - new Date(visit.started_at).getTime();
        totalDuration += duration / (1000 * 60); // Convert to minutes
      }
    });
    const averageDuration = visits.length > 0 ? totalDuration / visits.length : 0;

    return {
      weeklyPasses3m,
      dailyPasses90d,
      averagePassesPerMonth,
      totalDuration,
      averageDuration,
    };
  }, [visits]);
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
