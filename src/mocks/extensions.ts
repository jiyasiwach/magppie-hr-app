import type {
  AssistantConversation,
  CustomField,
  CustomFieldValue,
  Integration,
  SavedReport,
  Survey,
  SurveyAnswer,
  SurveyQuestion,
  SurveyParticipation,
  SurveyResponse,
} from '@/lib/types';
import { employees } from './employees';
import { intBetween, makeRng, pick } from './seed';

const IST = '+05:30';

/**
 * ============================================================================
 * INVENTED — every field, survey and threshold below is a placeholder
 * ============================================================================
 * Which custom fields Magppie actually needs, what its surveys ask, and who may
 * see what, are all decisions HR has not made. These exist so the screens and
 * the back end have something real-shaped to work against.
 * ============================================================================
 */

// --- 7.1 Custom fields ------------------------------------------------------

export const customFields: CustomField[] = [
  {
    id: 'cf-trade-cert',
    recordType: 'employee',
    label: 'Trade certification',
    key: 'trade_certification',
    fieldType: 'text',
    options: [],
    required: false,
    visibleTo: 'hr-only',
    editableBy: 'hr-only',
    displayOrder: 1,
    active: true,
    helpText: 'Stone fabrication or machine certification held, if any.',
  },
  {
    id: 'cf-uniform',
    recordType: 'employee',
    label: 'Uniform size',
    key: 'uniform_size',
    fieldType: 'dropdown',
    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    required: false,
    visibleTo: 'employee',
    editableBy: 'employee',
    displayOrder: 2,
    active: true,
    helpText: 'You can change this yourself.',
  },
  {
    id: 'cf-site-pass',
    recordType: 'employee',
    label: 'Site pass number',
    key: 'site_pass_number',
    fieldType: 'text',
    options: [],
    required: false,
    visibleTo: 'manager',
    editableBy: 'hr-only',
    displayOrder: 3,
    active: true,
    helpText: 'Needed for client sites with controlled access.',
  },
  {
    id: 'cf-blood-group',
    recordType: 'employee',
    label: 'Blood group',
    key: 'blood_group',
    fieldType: 'dropdown',
    options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: false,
    visibleTo: 'hr-only',
    editableBy: 'hr-only',
    displayOrder: 4,
    active: true,
    helpText: 'Held for emergencies at the plant and on site.',
  },
  {
    id: 'cf-emergency',
    recordType: 'employee',
    label: 'Emergency contact',
    key: 'emergency_contact',
    fieldType: 'text',
    options: [],
    required: true,
    visibleTo: 'hr-only',
    editableBy: 'employee',
    displayOrder: 5,
    active: true,
    helpText: 'Name and number of someone we should call.',
  },
  {
    /** Retired, not deleted. Old records keep their values. */
    id: 'cf-old-locker',
    recordType: 'employee',
    label: 'Locker number (old scheme)',
    key: 'locker_number',
    fieldType: 'text',
    options: [],
    required: false,
    visibleTo: 'hr-only',
    editableBy: 'hr-only',
    displayOrder: 6,
    active: false,
    helpText: 'Retired when the plant moved to card access.',
  },
  {
    id: 'cf-warranty',
    recordType: 'asset',
    label: 'Warranty expiry',
    key: 'warranty_expiry',
    fieldType: 'date',
    options: [],
    required: false,
    visibleTo: 'hr-only',
    editableBy: 'hr-only',
    displayOrder: 1,
    active: true,
    helpText: null,
  },
  {
    id: 'cf-cost-centre',
    recordType: 'request',
    label: 'Cost centre',
    key: 'cost_centre',
    fieldType: 'dropdown',
    options: ['Production', 'Showroom', 'Site', 'Head office'],
    required: false,
    visibleTo: 'hr-only',
    editableBy: 'hr-only',
    displayOrder: 1,
    active: true,
    helpText: 'Used when an expense claim is pushed to Books.',
  },
];

function buildValues(): CustomFieldValue[] {
  const out: CustomFieldValue[] = [];
  const sizes = ['S', 'M', 'L', 'XL'];
  const bloods = ['A+', 'B+', 'O+', 'AB+', 'O-'];
  const certs = ['CNC Level 2', 'Slab handling', 'Edge polishing', 'Forklift', ''];

  employees.forEach((e) => {
    const rng = makeRng(`cf:${e.id}`);
    out.push({ id: `cfv-${e.id}-uniform`, fieldId: 'cf-uniform', recordId: e.id, value: pick(rng, sizes) });
    out.push({ id: `cfv-${e.id}-blood`, fieldId: 'cf-blood-group', recordId: e.id, value: pick(rng, bloods) });
    out.push({
      id: `cfv-${e.id}-emergency`,
      fieldId: 'cf-emergency',
      recordId: e.id,
      value: `${pick(rng, ['Spouse', 'Parent', 'Sibling'])} · +91 9${intBetween(rng, 100000000, 999999999)}`,
    });
    if (e.department === 'Production' || e.department === 'Installation') {
      const cert = pick(rng, certs);
      if (cert) out.push({ id: `cfv-${e.id}-cert`, fieldId: 'cf-trade-cert', recordId: e.id, value: cert });
      out.push({
        id: `cfv-${e.id}-pass`,
        fieldId: 'cf-site-pass',
        recordId: e.id,
        value: `SP-${intBetween(rng, 10000, 99999)}`,
      });
    }
  });

  // A value on a retired field, to prove retiring does not erase history.
  out.push({ id: 'cfv-emp-016-locker', fieldId: 'cf-old-locker', recordId: 'emp-016', value: 'L-214' });
  return out;
}

export const customFieldValues: CustomFieldValue[] = buildValues();

// --- 7.4–7.7 Surveys --------------------------------------------------------

export const surveys: Survey[] = [
  {
    id: 'sv-enps-q3',
    title: 'How is work going?',
    description:
      'A short quarterly check. Anonymous — nothing you write is stored against your name.',
    audience: ['everyone'],
    anonymous: true,
    opensOn: '2026-09-01',
    closesOn: '2026-09-30',
    status: 'open',
    createdBy: 'emp-005',
  },
  {
    id: 'sv-enps-q2',
    title: 'How is work going?',
    description: 'The previous quarterly check, kept so the trend has something to compare against.',
    audience: ['everyone'],
    anonymous: true,
    opensOn: '2026-06-01',
    closesOn: '2026-06-30',
    status: 'closed',
    createdBy: 'emp-005',
  },
  {
    id: 'sv-canteen',
    title: 'Canteen and break facilities at the Noida plant',
    description: 'We are reviewing the canteen contract and want the floor’s view first.',
    audience: ['pg-factory-a', 'pg-factory-b'],
    anonymous: true,
    opensOn: '2026-08-15',
    closesOn: '2026-08-31',
    status: 'closed',
    createdBy: 'emp-005',
  },
  {
    id: 'sv-showroom-tools',
    title: 'Showroom sample kit — what is missing?',
    description: 'Named, because we will want to follow up on specifics with you.',
    audience: ['pg-showroom'],
    anonymous: false,
    opensOn: '2026-09-05',
    closesOn: '2026-09-20',
    status: 'open',
    createdBy: 'emp-004',
  },
];

export const surveyQuestions: SurveyQuestion[] = [
  { id: 'sq-1', surveyId: 'sv-enps-q3', type: 'enps', text: 'How likely are you to recommend Magppie as a place to work?', options: [], order: 1, required: true },
  { id: 'sq-2', surveyId: 'sv-enps-q3', type: 'rating', text: 'I have what I need to do my job well.', options: [], order: 2, required: true },
  { id: 'sq-3', surveyId: 'sv-enps-q3', type: 'rating', text: 'I know who to go to when something is wrong.', options: [], order: 3, required: true },
  { id: 'sq-4', surveyId: 'sv-enps-q3', type: 'single-choice', text: 'Where do you mostly work?', options: ['Head office', 'Showroom', 'Factory', 'Client site'], order: 4, required: true },
  { id: 'sq-5', surveyId: 'sv-enps-q3', type: 'free-text', text: 'Anything you would change, in your own words?', options: [], order: 5, required: false },

  { id: 'sq-1b', surveyId: 'sv-enps-q2', type: 'enps', text: 'How likely are you to recommend Magppie as a place to work?', options: [], order: 1, required: true },
  { id: 'sq-2b', surveyId: 'sv-enps-q2', type: 'rating', text: 'I have what I need to do my job well.', options: [], order: 2, required: true },

  { id: 'sq-6', surveyId: 'sv-canteen', type: 'rating', text: 'The canteen food is good enough.', options: [], order: 1, required: true },
  { id: 'sq-7', surveyId: 'sv-canteen', type: 'multi-choice', text: 'What would help most?', options: ['Longer opening hours', 'More vegetarian options', 'Cleaner seating', 'Lower prices', 'Drinking water points'], order: 2, required: true },
  { id: 'sq-8', surveyId: 'sv-canteen', type: 'free-text', text: 'Anything else?', options: [], order: 3, required: false },

  { id: 'sq-9', surveyId: 'sv-showroom-tools', type: 'multi-choice', text: 'Which samples do clients ask for that we do not carry?', options: ['Edge profiles', 'Sink cut-outs', 'Splashback finishes', 'Colour range', 'Thickness options'], order: 1, required: true },
  { id: 'sq-10', surveyId: 'sv-showroom-tools', type: 'free-text', text: 'Describe the most common request.', options: [], order: 2, required: false },
];

/**
 * Responses are generated so that one survey clears the five-respondent
 * threshold and one deliberately does not, which is the only way to see the
 * suppression rule actually working.
 */
function buildResponses(): { responses: SurveyResponse[]; answers: SurveyAnswer[] } {
  const responses: SurveyResponse[] = [];
  const answers: SurveyAnswer[] = [];

  const add = (surveyId: string, index: number, anonymous: boolean, respondentId: string | null, day: string) => {
    const id = `sr-${surveyId}-${index}`;
    responses.push({
      id,
      surveyId,
      // Anonymous surveys store no respondent, and the timestamp is coarsened
      // to the day so it cannot be matched to one person's session.
      respondentId: anonymous ? null : respondentId,
      submittedOn: anonymous ? `${day}T00:00:00${IST}` : `${day}T${10 + (index % 8)}:15:00${IST}`,
    });
    return id;
  };

  // eNPS — 22 responses, comfortably above the threshold.
  const comments = [
    'The new extraction in bay 3 made a real difference.',
    'Shift swaps take too long to get approved.',
    'I like that leave balances finally make sense.',
    'Canteen timings still clash with the handover.',
    'More sample kits in the showroom would help us sell.',
    '',
    '',
    'Training on the new CNC was useful, more of that please.',
  ];
  const places = ['Head office', 'Showroom', 'Factory', 'Client site'];

  for (let i = 0; i < 22; i += 1) {
    const rng = makeRng(`enps:${i}`);
    const rid = add('sv-enps-q3', i, true, null, `2026-09-${String(2 + (i % 8)).padStart(2, '0')}`);
    answers.push({ id: `sa-e-${i}-1`, responseId: rid, questionId: 'sq-1', value: String(intBetween(rng, 4, 10)) });
    answers.push({ id: `sa-e-${i}-2`, responseId: rid, questionId: 'sq-2', value: String(intBetween(rng, 2, 5)) });
    answers.push({ id: `sa-e-${i}-3`, responseId: rid, questionId: 'sq-3', value: String(intBetween(rng, 2, 5)) });
    answers.push({ id: `sa-e-${i}-4`, responseId: rid, questionId: 'sq-4', value: pick(rng, places) });
    const c = pick(rng, comments);
    if (c) answers.push({ id: `sa-e-${i}-5`, responseId: rid, questionId: 'sq-5', value: c });
  }

  // The previous quarter, so the trend has two points. Deliberately a lower
  // score than the current one — a flat line proves nothing.
  for (let i = 0; i < 18; i += 1) {
    const rng = makeRng(`enpsq2:${i}`);
    const rid = add('sv-enps-q2', i, true, null, `2026-06-${String(4 + (i % 10)).padStart(2, '0')}`);
    answers.push({ id: `sa-q2-${i}-1`, responseId: rid, questionId: 'sq-1b', value: String(intBetween(rng, 3, 9)) });
    answers.push({ id: `sa-q2-${i}-2`, responseId: rid, questionId: 'sq-2b', value: String(intBetween(rng, 2, 4)) });
  }

  // Canteen — only 3 responses. Below the threshold on purpose.
  for (let i = 0; i < 3; i += 1) {
    const rng = makeRng(`cant:${i}`);
    const rid = add('sv-canteen', i, true, null, `2026-08-${String(18 + i).padStart(2, '0')}`);
    answers.push({ id: `sa-c-${i}-1`, responseId: rid, questionId: 'sq-6', value: String(intBetween(rng, 1, 3)) });
    answers.push({ id: `sa-c-${i}-2`, responseId: rid, questionId: 'sq-7', value: 'Longer opening hours' });
  }

  // Showroom — named survey, 6 responses.
  const showroomFolk = ['emp-022', 'emp-024', 'emp-026', 'emp-028', 'emp-029', 'emp-025'];
  showroomFolk.forEach((who, i) => {
    const rid = add('sv-showroom-tools', i, false, who, `2026-09-${String(6 + i).padStart(2, '0')}`);
    answers.push({ id: `sa-s-${i}-1`, responseId: rid, questionId: 'sq-9', value: 'Edge profiles' });
    if (i % 2 === 0) {
      answers.push({ id: `sa-s-${i}-2`, responseId: rid, questionId: 'sq-10', value: 'Clients keep asking to feel the 3mm chamfer.' });
    }
  });

  return { responses, answers };
}

const built = buildResponses();
export const surveyResponses: SurveyResponse[] = built.responses;
export const surveyAnswers: SurveyAnswer[] = built.answers;

/** Who took part, with no key back to what they said. */
export const surveyParticipation: SurveyParticipation[] = [
  ...employees.slice(0, 18).map((e, i) => ({
    id: `sp-enpsq2-${i}`,
    surveyId: 'sv-enps-q2',
    employeeId: e.id,
    respondedOn: `2026-06-${String(4 + (i % 10)).padStart(2, '0')}`,
  })),
  ...employees.slice(0, 22).map((e, i) => ({
    id: `sp-enps-${i}`,
    surveyId: 'sv-enps-q3',
    employeeId: e.id,
    respondedOn: `2026-09-${String(2 + (i % 8)).padStart(2, '0')}`,
  })),
  ...['emp-016', 'emp-018', 'emp-015'].map((id, i) => ({
    id: `sp-cant-${i}`,
    surveyId: 'sv-canteen',
    employeeId: id,
    respondedOn: `2026-08-${String(18 + i).padStart(2, '0')}`,
  })),
  ...['emp-022', 'emp-024', 'emp-026', 'emp-028', 'emp-029', 'emp-025'].map((id, i) => ({
    id: `sp-show-${i}`,
    surveyId: 'sv-showroom-tools',
    employeeId: id,
    respondedOn: `2026-09-${String(6 + i).padStart(2, '0')}`,
  })),
];

// --- 7.8 Assistant conversations -------------------------------------------

export const assistantConversations: AssistantConversation[] = [
  {
    id: 'ac-1',
    employeeId: 'emp-008',
    startedOn: `2026-09-08T11:02:00${IST}`,
    endedInHandoff: false,
    messages: [
      { id: 'am-1', role: 'person', body: 'How much casual leave do I have left?', citations: [], createdOn: `2026-09-08T11:02:00${IST}`, handoff: false },
      { id: 'am-2', role: 'assistant', body: 'You have 6 days of casual leave available.', citations: ['pol-leave'], createdOn: `2026-09-08T11:02:04${IST}`, handoff: false },
    ],
  },
  {
    id: 'ac-2',
    employeeId: 'emp-028',
    startedOn: `2026-09-09T15:40:00${IST}`,
    endedInHandoff: true,
    messages: [
      { id: 'am-3', role: 'person', body: 'My manager keeps giving me the worst shifts and I want to complain', citations: [], createdOn: `2026-09-09T15:40:00${IST}`, handoff: false },
      { id: 'am-4', role: 'assistant', body: 'That is not something I should answer. It needs a person.', citations: [], createdOn: `2026-09-09T15:40:03${IST}`, handoff: true },
    ],
  },
];

// --- 7.9 Saved reports ------------------------------------------------------

export const savedReports: SavedReport[] = [
  {
    id: 'rep-site-passes',
    name: 'Site pass numbers — installation team',
    recordType: 'employee',
    columns: ['fullName', 'department', 'location', 'custom:site_pass_number'],
    filters: [{ column: 'department', operator: 'eq', value: 'Installation' }],
    groupBy: 'location',
    createdBy: 'emp-005',
    sharedWith: ['hr-admin', 'manager'],
    createdOn: `2026-08-20T10:00:00${IST}`,
  },
  {
    id: 'rep-uniforms',
    name: 'Uniform sizes for the plant order',
    recordType: 'employee',
    columns: ['fullName', 'department', 'custom:uniform_size'],
    filters: [{ column: 'department', operator: 'eq', value: 'Production' }],
    groupBy: null,
    createdBy: 'emp-005',
    sharedWith: ['hr-admin'],
    createdOn: `2026-09-01T09:30:00${IST}`,
  },
  {
    id: 'rep-probation',
    name: 'Everyone on probation',
    recordType: 'employee',
    columns: ['fullName', 'department', 'joiningDate', 'probationEndDate'],
    filters: [{ column: 'status', operator: 'eq', value: 'probation' }],
    groupBy: 'department',
    createdBy: 'emp-005',
    sharedWith: ['hr-admin', 'manager'],
    createdOn: `2026-07-11T12:00:00${IST}`,
  },
];

// --- 5. Integrations --------------------------------------------------------

/**
 * Shapes and failure behaviour only. No vendor has been chosen for anything
 * here, and nothing is wired.
 */
export const integrations: Integration[] = [
  {
    id: 'zoho-crm',
    name: 'Zoho CRM',
    purpose: 'Pull sales targets and achievement onto the profile of people in sales roles, so an appraisal is not a separate data-gathering exercise.',
    direction: 'read',
    status: 'not-configured',
    failureBehaviour:
      'The targets section on the profile shows "Targets could not be loaded from CRM" with a retry. The rest of the profile renders normally. No cached figure is shown as if it were current.',
    openQuestions: [
      'Which CRM users map to which employees, and on what key?',
      'Which target period does the profile show — month, quarter, or the running year?',
      'Does anyone other than the person and HR see their numbers?',
    ],
  },
  {
    id: 'zoho-books',
    name: 'Zoho Books',
    purpose: 'Push approved expense claims and reimbursements so finance is not re-keying them.',
    direction: 'write',
    status: 'not-configured',
    failureBehaviour:
      'The claim stays approved in this app and is queued, marked "Not yet sent to Books", and retried. It is never marked reimbursed on the strength of a request that failed, and it is never written twice — the claim id is the idempotency key.',
    openQuestions: [
      'What must a claim carry for Books to accept it — cost centre, tax treatment, vendor, GST number?',
      'Which Books organisation does each legal entity map to?',
      'Who owns a claim that Books rejects, and where does the person see that?',
    ],
  },
  {
    id: 'lnd-portal',
    name: 'L&D portal',
    purpose: 'Training completions and assessment results on the employee timeline.',
    direction: 'read',
    status: 'not-configured',
    failureBehaviour:
      'The timeline renders its HR entries and shows "Training history is unavailable right now" in place of the L&D entries, rather than an incomplete timeline that looks complete.',
    openQuestions: [
      'A shared stable identifier — work email is the only common key today and it is a poor one.',
      'Do assessment scores cross the boundary, or only pass and fail?',
    ],
  },
  {
    id: 'email',
    name: 'Email',
    purpose: 'Notifications, through the single notification layer. No module calls it directly.',
    direction: 'write',
    status: 'not-configured',
    failureBehaviour:
      'The notification stays in the in-app list, which is the source of truth, and is marked as not delivered by email. Nothing in the app depends on an email having arrived.',
    openQuestions: ['Which sending domain and provider?', 'Which notifications are worth an email at all?'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    purpose: 'Notifications for staff who do not check email — factory and site.',
    direction: 'write',
    status: 'not-configured',
    failureBehaviour: 'Same as email: the in-app notification is authoritative and delivery is marked as failed.',
    openQuestions: [
      'Business API provider and number.',
      'Template approval — WhatsApp requires pre-approved templates, which constrains what a notification can say.',
      'Consent. Sending work messages to a personal number needs it, and a way to withdraw it.',
    ],
  },
];
