'use client';

import { Avatar, Card, PageHeader, Small, Stack } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { ORGANISATION_NAME } from '@/lib/constants';
import { formatDate } from '@/lib/date';
import { employmentTypeLabels } from '@/lib/labels';
import s from './idCard.module.css';

export default function IdCardPage() {
  const { user } = useCurrentUser();
  const e = user.employee;

  return (
    <>
      <PageHeader title="ID card" description="Your identity as the company records it." />
      <Stack>
        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={s.org}>{ORGANISATION_NAME}</span>
            <span className={s.code}>{e.employeeCode}</span>
          </div>
          <div className={s.cardBody}>
            <Avatar name={e.fullName} size="lg" />
            <div className={s.identity}>
              <span className={s.name}>{e.fullName}</span>
              <span className={s.role}>{e.designation}</span>
              <span className={s.meta}>{e.department}</span>
            </div>
          </div>
          <dl className={s.details}>
            <div>
              <dt>Location</dt>
              <dd>{e.location}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatDate(e.joiningDate)}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{employmentTypeLabels[e.employmentType]}</dd>
            </div>
            <div>
              <dt>Work email</dt>
              <dd>{e.workEmail}</dd>
            </div>
          </dl>
        </div>

        <Card>
          <Small>
            What belongs on a Magppie ID card has not been specified — no blood group, emergency contact,
            QR code, validity date or issuing signature exists in the data, and none has been invented.
            This shows only fields the record actually holds. There is also no photo storage, so the
            initials stand in for one.
          </Small>
        </Card>
      </Stack>
    </>
  );
}
