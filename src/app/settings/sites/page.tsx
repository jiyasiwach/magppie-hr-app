'use client';

import { useState } from 'react';
import { AsyncSection, Button, Card, PageHeader, Small, Stack, StatusPill } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { DEFAULT_SITE_RADIUS_M, getSites, setSitePosition } from '@/data/verification';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/date';
import { currentPosition, formatFix } from '@/lib/geo';
import { canSeeSettings } from '@/lib/permissions';
import type { AttendanceSite } from '@/lib/types';

/**
 * Where each office, factory and showroom is, so a clock-in can be checked
 * against it. Positions are never typed in or guessed: HR records them by
 * standing at the site with a phone.
 */
export default function SitesPage() {
  const { user } = useCurrentUser();
  const allowed = canSeeSettings(user);
  const { state, reload } = useAsync(() => getSites(), []);

  return (
    <Stack>
      <PageHeader
        title="Attendance sites"
        description="Where each site is, and how far from it a clock-in may be before it is flagged for review. Flags never block a punch."
      />
      <AsyncSection state={state} reload={reload} allowed={allowed} deniedLabel="attendance sites">
        {(sites) => (
          <Stack>
            {sites.map((site) => (
              <SiteCard key={site.name} site={site} by={user.employee.fullName} />
            ))}
            <Small>
              The allowed distance starts at {DEFAULT_SITE_RADIUS_M} m. That figure was never given by HR — it is a
              placeholder to change per site.
            </Small>
          </Stack>
        )}
      </AsyncSection>
    </Stack>
  );
}

function SiteCard({ site, by }: { site: AttendanceSite; by: string }) {
  const [radius, setRadius] = useState(String(site.radiusM));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const set = site.latitude != null && site.longitude != null;

  const pinHere = async () => {
    setBusy(true);
    setNote(null);
    try {
      const fix = await currentPosition();
      if (fix.accuracyM > 100) {
        setNote(`Your phone reported ±${fix.accuracyM} m, which is too rough to pin a site. Step outside and try again.`);
        return;
      }
      await setSitePosition(site.name, fix, Number(radius), by);
      setNote(`Saved: ${formatFix(fix)}.`);
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title={site.name}
      actions={<StatusPill label={set ? 'Position set' : 'Not set'} tone={set ? 'success' : 'warning'} />}
    >
      <Stack tight>
        <span>
          {set
            ? `${site.latitude!.toFixed(5)}, ${site.longitude!.toFixed(5)} · set by ${site.setBy} on ${formatDate(site.setAt!.slice(0, 10))}`
            : 'No position yet — clock-ins here are recorded, but the distance is not checked.'}
        </span>
        <label>
          Allowed distance (metres){' '}
          <input
            type="number"
            min={50}
            max={5000}
            step={10}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            style={{ width: 110 }}
          />
        </label>
        <div>
          <Button variant="primary" disabled={busy} onClick={() => void pinHere()}>
            {busy ? 'Getting your location…' : 'I am at this site — use my location'}
          </Button>
        </div>
        {note ? <Small>{note}</Small> : null}
      </Stack>
    </Card>
  );
}
