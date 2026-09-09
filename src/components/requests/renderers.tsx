import type { ReactNode } from 'react';
import type { Request, RequestType } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/date';
import { attendanceStatusLabels, documentTypeLabels, employeeFieldLabel } from '@/lib/labels';
import { employees, leaveTypes } from '@/mocks';

/** A manager id in a payload means nothing to a reader — show the person. */
function displayValue(field: unknown, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'managerId') {
    return employees.find((e) => e.id === value)?.fullName ?? String(value);
  }
  return String(value);
}

/**
 * The approvals queue does not know what a leave request or a regularisation
 * is. It renders whatever is registered here against `request.type`, which is
 * how later modules (onboarding, performance, payroll) plug into the same
 * queue without touching it.
 */
export interface RequestRenderer {
  summary: (request: Request) => string;
  details: (request: Request) => ReactNode;
}

const leaveTypeName = (id: unknown) => leaveTypes.find((t) => t.id === id)?.name ?? String(id);

export const requestRenderers: Partial<Record<RequestType, RequestRenderer>> = {
  leave: {
    summary: (r) => {
      const days = r.payload.days as number;
      const start = formatDate(r.payload.startDate as string);
      const end = formatDate(r.payload.endDate as string);
      const range = start === end ? start : `${start} – ${end}`;
      return `${leaveTypeName(r.payload.leaveTypeId)} · ${days} ${days === 1 ? 'day' : 'days'} · ${range}`;
    },
    details: (r) => (
      <>
        <span>Leave type</span>
        <span>{leaveTypeName(r.payload.leaveTypeId)}</span>
        <span>Dates</span>
        <span>
          {formatDate(r.payload.startDate as string)} – {formatDate(r.payload.endDate as string)}
        </span>
        <span>Days</span>
        <span>
          {r.payload.days as number}
          {r.payload.halfDayStart ? ' (half day at start)' : ''}
          {r.payload.halfDayEnd ? ' (half day at end)' : ''}
        </span>
        <span>Reason</span>
        <span>{r.payload.reason as string}</span>
      </>
    ),
  },
  regularisation: {
    summary: (r) =>
      `${formatDate(r.payload.date as string)} · ${
        attendanceStatusLabels[r.payload.currentStatus as keyof typeof attendanceStatusLabels] ?? 'Unknown'
      } → ${attendanceStatusLabels[r.payload.requestedStatus as keyof typeof attendanceStatusLabels] ?? 'Unknown'}`,
    details: (r) => (
      <>
        <span>Date</span>
        <span>{formatDate(r.payload.date as string)}</span>
        <span>Recorded now</span>
        <span>{attendanceStatusLabels[r.payload.currentStatus as keyof typeof attendanceStatusLabels]}</span>
        <span>Requested</span>
        <span>{attendanceStatusLabels[r.payload.requestedStatus as keyof typeof attendanceStatusLabels]}</span>
        <span>In / out</span>
        <span>
          {formatTime(r.payload.requestedFirstIn as string | null)} — {formatTime(r.payload.requestedLastOut as string | null)}
        </span>
        <span>Reason</span>
        <span>{r.payload.reason as string}</span>
      </>
    ),
  },
  document: {
    summary: (r) => `${documentTypeLabels[r.payload.documentType as keyof typeof documentTypeLabels] ?? 'Document'} · ${r.payload.fileName as string}`,
    details: (r) => (
      <>
        <span>File</span>
        <span>{r.payload.fileName as string}</span>
        <span>Type</span>
        <span>{documentTypeLabels[r.payload.documentType as keyof typeof documentTypeLabels]}</span>
        <span>Reason</span>
        <span>{r.payload.reason as string}</span>
      </>
    ),
  },
  'profile-change': {
    summary: (r) =>
      `${employeeFieldLabel(r.payload.field)}: ${displayValue(r.payload.field, r.payload.from)} → ${displayValue(r.payload.field, r.payload.to)}`,
    details: (r) => (
      <>
        <span>Field</span>
        <span>{employeeFieldLabel(r.payload.field)}</span>
        <span>From</span>
        <span>{displayValue(r.payload.field, r.payload.from)}</span>
        <span>To</span>
        <span>{displayValue(r.payload.field, r.payload.to)}</span>
        <span>Reason</span>
        <span>{r.payload.reason as string}</span>
      </>
    ),
  },
  wfh: {
    summary: (r) => {
      const start = formatDate(r.payload.startDate as string);
      const end = formatDate(r.payload.endDate as string);
      return `Work from home · ${start === end ? start : `${start} – ${end}`}`;
    },
    details: (r) => (
      <>
        <span>Dates</span>
        <span>
          {formatDate(r.payload.startDate as string)} – {formatDate(r.payload.endDate as string)}
        </span>
        <span>Reason</span>
        <span>{r.payload.reason as string}</span>
      </>
    ),
  },
  'on-duty': {
    summary: (r) => `On duty · ${formatDate(r.payload.date as string)} · ${r.payload.location as string}`,
    details: (r) => (
      <>
        <span>Date</span>
        <span>{formatDate(r.payload.date as string)}</span>
        <span>Where</span>
        <span>{r.payload.location as string}</span>
        <span>Reason</span>
        <span>{r.payload.reason as string}</span>
      </>
    ),
  },
  overtime: {
    summary: (r) => `Overtime · ${r.payload.hours as number}h on ${formatDate(r.payload.date as string)}`,
    details: (r) => (
      <>
        <span>Date</span>
        <span>{formatDate(r.payload.date as string)}</span>
        <span>Hours</span>
        <span>{r.payload.hours as number}</span>
        <span>Reason</span>
        <span>{r.payload.reason as string}</span>
      </>
    ),
  },
  'partial-day': {
    summary: (r) =>
      `Partial day · ${formatDate(r.payload.date as string)} · ${r.payload.from as string}–${r.payload.to as string}`,
    details: (r) => (
      <>
        <span>Date</span>
        <span>{formatDate(r.payload.date as string)}</span>
        <span>Away between</span>
        <span>
          {r.payload.from as string} and {r.payload.to as string}
        </span>
        <span>Reason</span>
        <span>{r.payload.reason as string}</span>
      </>
    ),
  },
  asset: {
    summary: (r) => `Asset request · ${r.payload.assetName as string}`,
    details: (r) => (
      <>
        <span>Asset</span>
        <span>{r.payload.assetName as string}</span>
        <span>Reason</span>
        <span>{r.payload.reason as string}</span>
      </>
    ),
  },
  'hr-notice': {
    summary: (r) => r.payload.title as string,
    details: (r) => (
      <>
        <span>Notice</span>
        <span>{r.payload.body as string}</span>
      </>
    ),
  },
};

/** Fallback for a request type nobody has written a renderer for yet. */
export const fallbackRenderer: RequestRenderer = {
  summary: () => 'Request details are not rendered for this type yet.',
  details: (r) => (
    <>
      {Object.entries(r.payload).map(([key, value]) => (
        <span key={`${key}-pair`} style={{ display: 'contents' }}>
          <span>{key}</span>
          <span>{String(value)}</span>
        </span>
      ))}
    </>
  ),
};

export function rendererFor(type: RequestType): RequestRenderer {
  return requestRenderers[type] ?? fallbackRenderer;
}
