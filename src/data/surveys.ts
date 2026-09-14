import type { CurrentUser } from '@/lib/auth';
import type { Survey, SurveyQuestion } from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { read, store, write } from './store';

/**
 * ============================================================================
 * Surveys
 * ============================================================================
 * Two rules carry this module:
 *
 *  1. ANONYMITY is the same promise as in the Employee Voice module. On an
 *     anonymous survey no respondent id is written, and the submission time is
 *     coarsened to the day. Participation is tracked in a separate table with
 *     no key back to the answers, so a person cannot submit twice without the
 *     answers being linkable to them.
 *
 *  2. NO RESULT is shown for fewer than MIN_RESPONDENTS. In a team of three an
 *     average score is an individual's opinion with a number on it. This is
 *     enforced here, not left as guidance for whoever builds the screen.
 * ============================================================================
 */

export const MIN_RESPONDENTS = 5;

function audienceIncludes(survey: Survey, user: CurrentUser): boolean {
  if (survey.audience.includes('everyone')) return true;
  return (
    survey.audience.includes(user.employee.policyGroupId) ||
    survey.audience.includes(user.employee.entityId)
  );
}

export async function getOpenSurveysFor(user: CurrentUser): Promise<Survey[]> {
  return read(() =>
    store.surveys
      .filter((s) => s.status === 'open' && s.opensOn <= MOCK_TODAY && s.closesOn >= MOCK_TODAY)
      .filter((s) => audienceIncludes(s, user))
      .filter((s) => !hasRespondedSync(user.employee.id, s.id))
      .sort((a, b) => a.closesOn.localeCompare(b.closesOn)),
  );
}

export async function listSurveys(user: CurrentUser): Promise<Survey[]> {
  return read(() =>
    store.surveys
      .filter((s) => user.role === 'hr-admin' || audienceIncludes(s, user))
      .sort((a, b) => b.opensOn.localeCompare(a.opensOn)),
  );
}

export async function getSurvey(surveyId: string): Promise<Survey | null> {
  return read(() => store.surveys.find((s) => s.id === surveyId) ?? null);
}

export async function getQuestions(surveyId: string): Promise<SurveyQuestion[]> {
  return read(() =>
    store.surveyQuestions.filter((q) => q.surveyId === surveyId).sort((a, b) => a.order - b.order),
  );
}

function hasRespondedSync(employeeId: string, surveyId: string): boolean {
  return store.surveyParticipation.some((p) => p.employeeId === employeeId && p.surveyId === surveyId);
}

export async function hasResponded(user: CurrentUser, surveyId: string): Promise<boolean> {
  return read(() => hasRespondedSync(user.employee.id, surveyId));
}

/**
 * Answers and identity are written to different tables and never joined. On an
 * anonymous survey nothing is written that could join them.
 */
export async function submitResponse(
  user: CurrentUser,
  surveyId: string,
  answers: Record<string, string>,
): Promise<void> {
  await write(() => {
    const survey = store.surveys.find((s) => s.id === surveyId);
    if (!survey) throw new Error('No such survey.');
    if (survey.status !== 'open') throw new Error('That survey is closed.');
    if (hasRespondedSync(user.employee.id, surveyId)) throw new Error('You have already answered this one.');

    const questions = store.surveyQuestions.filter((q) => q.surveyId === surveyId);
    const missing = questions.filter((q) => q.required && !answers[q.id]?.trim());
    if (missing.length > 0) throw new Error(`Please answer: ${missing.map((q) => q.text).join(', ')}`);

    const nowIso = new Date().toISOString();
    const responseId = `sr-${surveyId}-${Date.now()}`;

    store.surveyResponses.push({
      id: responseId,
      surveyId,
      respondentId: survey.anonymous ? null : user.employee.id,
      submittedOn: survey.anonymous ? `${nowIso.slice(0, 10)}T00:00:00+05:30` : nowIso,
    });

    Object.entries(answers).forEach(([questionId, value], i) => {
      if (!value.trim()) return;
      store.surveyAnswers.push({
        id: `sa-${responseId}-${i}`,
        responseId,
        questionId,
        value: value.trim(),
      });
    });

    // Separate table, no key back to the response above.
    store.surveyParticipation.push({
      id: `sp-${surveyId}-${user.employee.id}`,
      surveyId,
      employeeId: user.employee.id,
      respondedOn: nowIso.slice(0, 10),
    });
  });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface QuestionResult {
  question: SurveyQuestion;
  /** Choice or rating distribution: label → count. */
  distribution: Array<{ label: string; count: number }>;
  average: number | null;
  /** Free text, shown exactly as written. Never scored. */
  texts: string[];
  /** eNPS only. */
  enps: { promoters: number; passives: number; detractors: number; score: number } | null;
}

export interface SurveyResults {
  survey: Survey;
  respondentCount: number;
  /** True when there are too few responses to show anything. */
  suppressed: boolean;
  questions: QuestionResult[];
  /** Response count by close date, for the trend across surveys. */
  trend: Array<{ surveyTitle: string; closesOn: string; score: number | null; responses: number }>;
}

export async function getResults(user: CurrentUser, surveyId: string): Promise<SurveyResults | null> {
  return read(() => {
    const survey = store.surveys.find((s) => s.id === surveyId);
    if (!survey) return null;
    if (user.role !== 'hr-admin' && survey.createdBy !== user.employee.id) return null;

    const responses = store.surveyResponses.filter((r) => r.surveyId === surveyId);
    const respondentCount = responses.length;
    const responseIds = new Set(responses.map((r) => r.id));
    const answers = store.surveyAnswers.filter((a) => responseIds.has(a.responseId));

    const suppressed = respondentCount < MIN_RESPONDENTS;

    const questions = store.surveyQuestions
      .filter((q) => q.surveyId === surveyId)
      .sort((a, b) => a.order - b.order)
      .map((question): QuestionResult => {
        const forQ = answers.filter((a) => a.questionId === question.id);

        if (suppressed) {
          return { question, distribution: [], average: null, texts: [], enps: null };
        }

        if (question.type === 'free-text') {
          return { question, distribution: [], average: null, texts: forQ.map((a) => a.value), enps: null };
        }

        if (question.type === 'enps') {
          const scores = forQ.map((a) => Number(a.value)).filter((n) => !Number.isNaN(n));
          const promoters = scores.filter((n) => n >= 9).length;
          const detractors = scores.filter((n) => n <= 6).length;
          const passives = scores.length - promoters - detractors;
          const score = scores.length
            ? Math.round(((promoters - detractors) / scores.length) * 100)
            : 0;
          return {
            question,
            distribution: Array.from({ length: 11 }, (_, n) => ({
              label: String(n),
              count: scores.filter((v) => v === n).length,
            })),
            average: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
            texts: [],
            enps: { promoters, passives, detractors, score },
          };
        }

        const counts = new Map<string, number>();
        forQ.forEach((a) => counts.set(a.value, (counts.get(a.value) ?? 0) + 1));
        const numeric = forQ.map((a) => Number(a.value)).filter((n) => !Number.isNaN(n));

        return {
          question,
          distribution: [...counts.entries()]
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count),
          average:
            question.type === 'rating' && numeric.length
              ? Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 10) / 10
              : null,
          texts: [],
          enps: null,
        };
      });

    // Trend across every closed or open survey that carried an eNPS question.
    const trend = store.surveys
      .filter((s) => store.surveyQuestions.some((q) => q.surveyId === s.id && q.type === 'enps'))
      .map((s) => {
        const rids = new Set(store.surveyResponses.filter((r) => r.surveyId === s.id).map((r) => r.id));
        const scores = store.surveyAnswers
          .filter((a) => rids.has(a.responseId))
          .filter((a) => store.surveyQuestions.find((q) => q.id === a.questionId)?.type === 'enps')
          .map((a) => Number(a.value))
          .filter((n) => !Number.isNaN(n));
        const promoters = scores.filter((n) => n >= 9).length;
        const detractors = scores.filter((n) => n <= 6).length;
        return {
          surveyTitle: s.title,
          closesOn: s.closesOn,
          responses: rids.size,
          score:
            rids.size >= MIN_RESPONDENTS && scores.length
              ? Math.round(((promoters - detractors) / scores.length) * 100)
              : null,
        };
      })
      .sort((a, b) => a.closesOn.localeCompare(b.closesOn));

    return { survey, respondentCount, suppressed, questions, trend };
  });
}
