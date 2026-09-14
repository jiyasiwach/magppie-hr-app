'use client';

import Link from 'next/link';
import { AsyncSection, Card, EmptyState, PageHeader, Stack, StatusPill } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { listSurveys, MIN_RESPONDENTS } from '@/data/surveys';
import { useAsync } from '@/hooks/useAsync';
import { MOCK_TODAY } from '@/lib/clock';
import { formatDate } from '@/lib/date';
import { surveyStatusLabels, surveyStatusTones } from '@/lib/labels';
import s from './surveys.module.css';

export default function SurveysPage() {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => listSurveys(user), [user.employee.id]);

  return (
    <>
      <PageHeader
        title="Surveys"
        description="Short, occasional, and mostly anonymous. Nothing you write is scored or analysed."
      />

      <Stack>
        <Card flush>
          <AsyncSection
            state={state}
            reload={reload}
            isEmpty={(rows) => rows.length === 0}
            empty={
              <EmptyState
                title="No surveys"
                body="When HR opens one that applies to you, it appears here and in your Inbox."
              />
            }
          >
            {(rows) => (
              <ul className={s.list}>
                {rows.map((survey) => {
                  const open = survey.status === 'open' && survey.closesOn >= MOCK_TODAY;
                  return (
                    <li key={survey.id}>
                      <Link href={`/surveys/${survey.id}`} className={s.row}>
                        <span className={s.rowMain}>
                          <span className={s.rowTitle}>{survey.title}</span>
                          <span className={s.rowMeta}>{survey.description}</span>
                          <span className={s.rowMeta}>
                            {open
                              ? `Closes ${formatDate(survey.closesOn)}`
                              : `Closed ${formatDate(survey.closesOn)}`}
                          </span>
                        </span>
                        <span className={s.pills}>
                          {survey.anonymous ? <StatusPill label="Anonymous" tone="info" /> : <StatusPill label="Named" tone="quiet" />}
                          <StatusPill label={surveyStatusLabels[survey.status]} tone={surveyStatusTones[survey.status]} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </AsyncSection>
        </Card>

        <Card title="How results are handled">
          <ul className={s.rules}>
            <li>
              No result is shown for fewer than <strong>{MIN_RESPONDENTS} respondents</strong>. In a
              small team an average score identifies people.
            </li>
            <li>
              On an anonymous survey your identity is <strong>not stored against your answers</strong>.
              A separate record notes that you took part, so you cannot be asked twice — it holds no
              link to what you said.
            </li>
            <li>Free-text answers are shown exactly as written. Nothing is scored for sentiment or tone.</li>
            <li>No department is ranked against another in a way that singles out a small team.</li>
          </ul>
        </Card>
      </Stack>
    </>
  );
}
