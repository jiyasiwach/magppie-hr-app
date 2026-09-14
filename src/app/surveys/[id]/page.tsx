'use client';

import { use, useState } from 'react';
import {
  AsyncSection,
  Button,
  Card,
  EmptyState,
  Grid,
  Metric,
  PageHeader,
  Small,
  Stack,
  StatusPill,
} from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import {
  getQuestions,
  getResults,
  getSurvey,
  hasResponded,
  MIN_RESPONDENTS,
  submitResponse,
} from '@/data/surveys';
import { useAsync } from '@/hooks/useAsync';
import { MOCK_TODAY } from '@/lib/clock';
import { formatDate } from '@/lib/date';
import { surveyStatusLabels, surveyStatusTones } from '@/lib/labels';
import type { SurveyQuestion } from '@/lib/types';
import s from '../surveys.module.css';

export default function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useCurrentUser();
  const surveyQuery = useAsync(() => getSurvey(id), [id]);
  const answeredQuery = useAsync(() => hasResponded(user, id), [user.employee.id, id]);

  return (
    <AsyncSection
      state={surveyQuery.state}
      reload={surveyQuery.reload}
      isEmpty={(v) => v === null}
      empty={<EmptyState title="No such survey" />}
      loadingRows={3}
    >
      {(survey) => {
        if (!survey) return null;
        const open = survey.status === 'open' && survey.closesOn >= MOCK_TODAY;
        const answered = answeredQuery.state.status === 'ready' && answeredQuery.state.data;
        const canSeeResults = user.role === 'hr-admin' || survey.createdBy === user.employee.id;

        return (
          <>
            <PageHeader
              title={survey.title}
              description={survey.description}
              actions={
                <>
                  {survey.anonymous ? <StatusPill label="Anonymous" tone="info" /> : <StatusPill label="Named" tone="quiet" />}
                  <StatusPill label={surveyStatusLabels[survey.status]} tone={surveyStatusTones[survey.status]} />
                </>
              }
            />

            <Stack>
              {survey.anonymous ? (
                <Card>
                  <p className={s.note}>
                    <Small>
                      Your answers are stored with <strong>no link to your name</strong>. A separate
                      record notes that you took part, so you are not asked twice — it holds nothing
                      about what you said. Free text is read as written; it is not scored or analysed.
                    </Small>
                  </p>
                </Card>
              ) : null}

              {open && !answered ? (
                <TakeSurvey surveyId={survey.id} />
              ) : answered ? (
                <Card>
                  <p className={s.done}>
                    You have answered this one. Thank you.{' '}
                    {survey.anonymous
                      ? 'Because it is anonymous, we cannot show you what you said — there is no record linking it to you.'
                      : ''}
                  </p>
                </Card>
              ) : (
                <Card>
                  <EmptyState
                    title="This survey is closed"
                    body={`It ran until ${formatDate(survey.closesOn)}.`}
                  />
                </Card>
              )}

              {canSeeResults ? <Results surveyId={survey.id} /> : null}
            </Stack>
          </>
        );
      }}
    </AsyncSection>
  );
}

function TakeSurvey({ surveyId }: { surveyId: string }) {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getQuestions(surveyId), [surveyId]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (questionId: string, value: string) =>
    setAnswers((a) => ({ ...a, [questionId]: value }));

  const toggleMulti = (questionId: string, option: string) => {
    const current = (answers[questionId] ?? '').split('|').filter(Boolean);
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    set(questionId, next.join('|'));
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await submitResponse(user, surveyId, answers);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Your answers">
      <AsyncSection state={state} reload={reload} loadingRows={4}>
        {(questions) => (
          <>
            {questions.map((q) => (
              <Question key={q.id} question={q} value={answers[q.id] ?? ''} onChange={set} onToggle={toggleMulti} />
            ))}
            {error ? <p className={s.error}>{error}</p> : null}
            <div style={{ marginTop: 16 }}>
              <Button variant="primary" onClick={submit} disabled={busy}>
                {busy ? 'Sending…' : 'Submit'}
              </Button>
            </div>
          </>
        )}
      </AsyncSection>
    </Card>
  );
}

function Question({
  question,
  value,
  onChange,
  onToggle,
}: {
  question: SurveyQuestion;
  value: string;
  onChange: (id: string, v: string) => void;
  onToggle: (id: string, option: string) => void;
}) {
  const selected = value.split('|').filter(Boolean);

  return (
    <div className={s.question}>
      <span className={s.questionText}>
        {question.text}
        {question.required ? '' : ' (optional)'}
      </span>

      {question.type === 'enps' ? (
        <>
          <div className={s.scale}>
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                type="button"
                className={`${s.scaleButton} ${value === String(n) ? s.scaleActive : ''}`}
                aria-pressed={value === String(n)}
                onClick={() => onChange(question.id, String(n))}
              >
                {n}
              </button>
            ))}
          </div>
          <div className={s.scaleEnds}>
            <span>Not at all likely</span>
            <span>Extremely likely</span>
          </div>
        </>
      ) : null}

      {question.type === 'rating' ? (
        <>
          <div className={s.scale}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`${s.scaleButton} ${value === String(n) ? s.scaleActive : ''}`}
                aria-pressed={value === String(n)}
                onClick={() => onChange(question.id, String(n))}
              >
                {n}
              </button>
            ))}
          </div>
          <div className={s.scaleEnds} style={{ maxWidth: 250 }}>
            <span>Disagree</span>
            <span>Agree</span>
          </div>
        </>
      ) : null}

      {question.type === 'single-choice' ? (
        <div className={s.choices}>
          {question.options.map((o) => (
            <label key={o} className={s.choice}>
              <input
                type="radio"
                name={question.id}
                checked={value === o}
                onChange={() => onChange(question.id, o)}
              />
              {o}
            </label>
          ))}
        </div>
      ) : null}

      {question.type === 'multi-choice' ? (
        <div className={s.choices}>
          {question.options.map((o) => (
            <label key={o} className={s.choice}>
              <input type="checkbox" checked={selected.includes(o)} onChange={() => onToggle(question.id, o)} />
              {o}
            </label>
          ))}
        </div>
      ) : null}

      {question.type === 'free-text' ? (
        <textarea
          value={value}
          aria-label={question.text}
          onChange={(e) => onChange(question.id, e.target.value)}
        />
      ) : null}
    </div>
  );
}

function Results({ surveyId }: { surveyId: string }) {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getResults(user, surveyId), [user.employee.id, surveyId]);

  return (
    <Card title="Results" hint="Distribution and trend only — never an individual answer">
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(r) => r === null}
        empty={<EmptyState title="Results are not available to you" />}
        loadingRows={4}
      >
        {(results) => {
          if (!results) return null;
          if (results.suppressed) {
            return (
              <EmptyState
                title={`Too few responses to show anything`}
                body={`${results.respondentCount} ${results.respondentCount === 1 ? 'person has' : 'people have'} answered. Nothing is shown below ${MIN_RESPONDENTS}, because in a group that small an average is an individual's answer with a number on it.`}
              />
            );
          }

          return (
            <>
              <Grid>
                <Metric value={results.respondentCount} label="Respondents" />
                {results.questions.find((q) => q.enps) ? (
                  <Metric
                    value={results.questions.find((q) => q.enps)!.enps!.score}
                    label="eNPS"
                    note={
                      <Small>
                        <span className={s.note}>Promoters minus detractors, as a percentage.</span>
                      </Small>
                    }
                  />
                ) : null}
              </Grid>

              {results.questions.map((q) => (
                <div key={q.question.id} className={s.question}>
                  <span className={s.questionText}>{q.question.text}</span>

                  {q.enps ? (
                    <div className={s.enps}>
                      <span className={s.enpsScore}>{q.enps.score}</span>
                      <span className={s.note}>
                        {q.enps.promoters} promoters · {q.enps.passives} passives · {q.enps.detractors}{' '}
                        detractors · average {q.average}
                      </span>
                    </div>
                  ) : null}

                  {q.distribution.length > 0 ? (
                    <div>
                      {q.distribution.map((d) => {
                        const max = Math.max(...q.distribution.map((x) => x.count), 1);
                        return (
                          <div key={d.label} className={s.bar}>
                            <span>{d.label}</span>
                            <span className={s.barTrack}>
                              <span className={s.barFill} style={{ width: `${(d.count / max) * 100}%` }} />
                            </span>
                            <span>{d.count}</span>
                          </div>
                        );
                      })}
                      {q.average !== null && !q.enps ? (
                        <p className={s.note}>
                          <Small>Average {q.average}</Small>
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {q.texts.length > 0 ? (
                    <div className={s.texts}>
                      {q.texts.map((t, i) => (
                        <p key={i} className={s.text}>
                          {t}
                        </p>
                      ))}
                      <p className={s.note}>
                        <Small>
                          Shown exactly as written. Nothing here is scored for sentiment or tone.
                        </Small>
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}

              {results.trend.length > 1 ? (
                <div className={s.question}>
                  <span className={s.questionText}>eNPS over time</span>
                  {results.trend.map((t) => (
                    <div key={t.surveyTitle} className={s.bar}>
                      <span>{formatDate(t.closesOn)}</span>
                      <span className={s.barTrack}>
                        <span
                          className={s.barFill}
                          style={{ width: `${t.score === null ? 0 : Math.max(0, (t.score + 100) / 2)}%` }}
                        />
                      </span>
                      <span>{t.score === null ? '—' : t.score}</span>
                    </div>
                  ))}
                  <p className={s.note}>
                    <Small>A dash means that survey had too few responses to show a score.</Small>
                  </p>
                </div>
              ) : null}
            </>
          );
        }}
      </AsyncSection>
    </Card>
  );
}
