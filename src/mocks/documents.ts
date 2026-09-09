import type { DocumentType, DocumentVisibility, EmployeeDocument } from '@/lib/types';
import { employees } from './employees';
import { intBetween, makeRng } from './seed';

const standard: Array<{ type: DocumentType; fileName: string; visibility: DocumentVisibility }> = [
  { type: 'identity', fileName: 'aadhaar.pdf', visibility: 'hr-only' },
  { type: 'identity', fileName: 'pan-card.pdf', visibility: 'hr-only' },
  { type: 'employment', fileName: 'offer-letter.pdf', visibility: 'employee' },
  { type: 'employment', fileName: 'appointment-letter.pdf', visibility: 'employee' },
  { type: 'education', fileName: 'degree-certificate.pdf', visibility: 'hr-only' },
  { type: 'payroll', fileName: 'bank-mandate.pdf', visibility: 'hr-only' },
  { type: 'medical', fileName: 'group-mediclaim-card.pdf', visibility: 'employee' },
  { type: 'other', fileName: 'previous-employer-relieving-letter.pdf', visibility: 'hr-only' },
];

function build(): EmployeeDocument[] {
  const out: EmployeeDocument[] = [];

  employees.forEach((employee) => {
    const rng = makeRng(`doc:${employee.id}`);
    const count = intBetween(rng, 3, standard.length);
    for (let i = 0; i < count; i += 1) {
      const spec = standard[i];
      const uploadedBy = spec.visibility === 'employee' ? 'emp-036' : 'emp-005';
      out.push({
        id: `doc-${employee.id}-${i}`,
        employeeId: employee.id,
        type: spec.type,
        fileName: `${employee.employeeCode.toLowerCase()}-${spec.fileName}`,
        uploadedBy,
        uploadedOn: `${employee.joiningDate}T11:${String(10 + i).padStart(2, '0')}:00+05:30`,
        visibility: spec.visibility,
        archived: false,
      });
    }
  });

  // 8.3: organisation-wide documents. employeeId is null — these belong to the
  // company, not a person, and everyone can read them.
  const orgDocs: Array<{ type: DocumentType; fileName: string }> = [
    { type: 'policy', fileName: 'code-of-conduct-v3-1.pdf' },
    { type: 'policy', fileName: 'leave-policy-v2-0.pdf' },
    { type: 'policy', fileName: 'attendance-and-shift-policy-v1-4.pdf' },
    { type: 'policy', fileName: 'factory-floor-safety-v2-2.pdf' },
    { type: 'policy', fileName: 'it-and-data-usage-v1-1.pdf' },
    { type: 'policy', fileName: 'posh-policy-v2-0.pdf' },
    { type: 'other', fileName: 'holiday-calendar-2026.pdf' },
    { type: 'other', fileName: 'expense-claim-form.pdf' },
    { type: 'other', fileName: 'employee-handbook-2026.pdf' },
  ];
  orgDocs.forEach((spec, i) => {
    out.push({
      id: `doc-org-${i}`,
      employeeId: null,
      type: spec.type,
      fileName: spec.fileName,
      uploadedBy: 'emp-005',
      uploadedOn: `2026-04-01T09:${String(10 + i).padStart(2, '0')}:00+05:30`,
      visibility: 'employee',
      archived: false,
    });
  });

  // One archived document, so the archive state is visible somewhere real.
  out.push({
    id: 'doc-emp-008-archived',
    employeeId: 'emp-008',
    type: 'employment',
    fileName: 'mag-0008-appointment-letter-superseded.pdf',
    uploadedBy: 'emp-005',
    uploadedOn: '2019-06-17T11:20:00+05:30',
    visibility: 'employee',
    archived: true,
  });

  return out;
}

export const employeeDocuments: EmployeeDocument[] = build();
