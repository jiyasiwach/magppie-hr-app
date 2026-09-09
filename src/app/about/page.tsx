'use client';

import { Card, PageHeader, Stack } from '@/components/ui';
import { APP_NAME, APP_VERSION, ORGANISATION_NAME } from '@/lib/constants';
import s from './about.module.css';

export default function AboutPage() {
  return (
    <>
      <PageHeader title="About" />
      <Stack>
        <Card>
          <dl className={s.list}>
            <div>
              <dt>App</dt>
              <dd>{APP_NAME}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{APP_VERSION}</dd>
            </div>
            <div>
              <dt>Organisation</dt>
              <dd>{ORGANISATION_NAME}</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>Mock only — nothing is stored and nothing leaves this device</dd>
            </div>
          </dl>
        </Card>
        <Card title="What this build is">
          <p className={s.body}>
            The front end of an in-house HR app. Every screen runs on invented mock data. There is no
            sign-in, no server and no database behind it yet, so nothing you do here persists past a
            reload. The product name has not been chosen — {APP_NAME} is a placeholder.
          </p>
        </Card>
      </Stack>
    </>
  );
}
