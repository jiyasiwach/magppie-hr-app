'use client';

import { AsyncSection, Card, PageHeader, Small, Stack, StatusPill } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { listIntegrations } from '@/data/integrations';
import { SIGNING_PROVIDER } from '@/data/signing';
import { useAsync } from '@/hooks/useAsync';
import {
  integrationDirectionLabels,
  integrationStatusLabels,
  integrationStatusTones,
} from '@/lib/labels';
import { canSeeSettings } from '@/lib/permissions';
import s from './integrations.module.css';

export default function IntegrationsPage() {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => listIntegrations(), []);

  return (
    <>
      <PageHeader
        title="Connections"
        description="The systems Magppie already runs. Shapes and failure behaviour are defined; nothing is wired, and no vendor has been chosen."
      />

      <Stack>
        <AsyncSection state={state} reload={reload} allowed={canSeeSettings(user)} deniedLabel="connections" loadingRows={4}>
          {(rows) => (
            <Stack>
              {rows.map((integration) => (
                <Card key={integration.id} title={integration.name}>
                  <div className={s.head}>
                    <StatusPill
                      label={integrationStatusLabels[integration.status]}
                      tone={integrationStatusTones[integration.status]}
                    />
                    <StatusPill label={integrationDirectionLabels[integration.direction]} tone="quiet" />
                  </div>

                  <p className={s.purpose}>{integration.purpose}</p>

                  <div className={s.block}>
                    <h3 className={s.subhead}>If the other system is unreachable</h3>
                    <p className={s.failure}>{integration.failureBehaviour}</p>
                  </div>

                  <div className={s.block}>
                    <h3 className={s.subhead}>Needs a decision before this can be built</h3>
                    <ul className={s.questions}>
                      {integration.openQuestions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </Card>
              ))}
            </Stack>
          )}
        </AsyncSection>

        <Card title="E-signature">
          <div className={s.head}>
            <StatusPill
              label={SIGNING_PROVIDER ? 'Connected' : 'No provider chosen'}
              tone={SIGNING_PROVIDER ? 'success' : 'quiet'}
            />
          </div>
          <p className={s.purpose}>
            Documents that need signing already carry a signing state and an immutable signature
            record. The signing engine itself is deliberately not built.
          </p>
          <div className={s.block}>
            <h3 className={s.subhead}>Needs a decision before this can be built</h3>
            <ul className={s.questions}>
              <li>Which provider — and whether it is legally an electronic signature under the Indian IT Act.</li>
              <li>Whether Aadhaar-based eSign is wanted for employment documents.</li>
              <li>Where the audit trail lives, and how long the provider retains it.</li>
              <li>What happens to a document that expires unsigned — resend, or void and reissue?</li>
            </ul>
          </div>
          <p className={s.note}>
            <Small>
              One rule already holds regardless of provider: an unsigned document is never treated as
              accepted, anywhere in this app. Silence is not agreement.
            </Small>
          </p>
        </Card>

        <Card title="One rule across all of them">
          <p className={s.note}>
            A failure is never swallowed silently, and a record is never left half-written across two
            systems. Where this app is the system of record it stays authoritative and marks the other
            side as not yet delivered; where the other system is authoritative, this app says the value
            could not be loaded rather than showing a stale one as though it were current.
          </p>
        </Card>
      </Stack>
    </>
  );
}
