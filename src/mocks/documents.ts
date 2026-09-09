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
