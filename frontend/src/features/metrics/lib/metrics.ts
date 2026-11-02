import { api } from '@/lib/api';
import { formatShortDateTime } from '@/lib/dateFormat';

export interface SignupMonth {
    month: string;
    roleId: string;
    count: number;
}

export interface RoleOption {
    id: string;
    name: string;
}

export interface SensitiveAction {
    id: string;
    action: string;
    createdAt: string;
    actorName: string | null;
    targetName: string | null;
}

export interface SeriesVsSingleGroup {
    series: number;
    single: number;
}

export interface SeriesVsSingle {
    finished: SeriesVsSingleGroup;
    ongoing: SeriesVsSingleGroup;
}

export interface IdleProject {
    id: string;
    name: string;
    color: string;
    lastEventAt: string | null;
}

export interface YoyMonth {
    month: string;
    events: number;
    registrations: number;
}

export interface YearOverYear {
    thisYear: YoyMonth[];
    lastYear: YoyMonth[];
}

export interface ProjectInterestVsRegistration {
    id: string;
    name: string;
    color: string;
    interested: number;
    registered: number;
}

export interface Retention {
    totalWithAtLeastOne: number;
    repeaters: number;
    percent: number | null;
}

export interface EmailLogBySlot {
    slot: string | null;
    origin: string;
    ok: number;
    failed: number;
}

export interface EmailLog {
    total: { ok: number; failed: number };
    bySlot: EmailLogBySlot[];
}

export interface MetricsSummary {
    windowDays: number;
    incompleteProfiles: number;
    inactiveAilCount: number;
    signupsByMonth: SignupMonth[];
    roles: RoleOption[];
    sensitiveActions: SensitiveAction[];
    seriesVsSingle: SeriesVsSingle;
    avgLeadTimeDays: number | null;
    idleProjects: IdleProject[];
    yearOverYear: YearOverYear;
    interestVsRegistration: ProjectInterestVsRegistration[];
    retention: Retention;
    emailLog: EmailLog;
}

export const getMetrics = (days: number) =>
    api.get<MetricsSummary>(`/metrics?days=${days}`);

export const formatMetricsDateTime = (iso: string): string =>
    formatShortDateTime(new Date(iso));
