/**
 * ============================================================================
 * L&D PORTAL INTEGRATION SEAM
 * ============================================================================
 * The one thing a bought HR product cannot do for Magppie: show training and
 * assessments from the company's own L&D portal on the employee's record,
 * read from that system rather than re-entered here.
 *
 * Nothing in this file talks to the L&D portal yet. It defines the shape of
 * what this app needs, and returns mock data in that shape, so that:
 *   - the timeline can be built and reviewed now, and
 *   - the L&D team has an exact specification to build against.
 *
 * WHAT THE L&D PORTAL MUST EXPOSE for this to work with real data:
 *
 *   1. A read endpoint, per person, returning completions:
 *        GET /api/completions?employeeRef=<ref>
 *      returning LndCompletion[] as typed below.
 *
 *   2. A shared, stable identifier. Work email is the only natural key the two
 *      systems have in common today, and it is a poor one — people change
 *      names and addresses. Agreeing an employee code that both systems carry
 *      is the better answer and is FLAGGED for a decision.
 *
 *   3. Service-to-service authentication. This is HR data about a named person;
 *      it must not be an open endpoint. A signed request between the two
 *      services, not a user token, because the HR app reads it on behalf of HR
 *      and of the person themselves.
 *
 *   4. An `updatedSince` filter, so this app can poll cheaply rather than
 *      pulling a full history on every profile view.
 *
 *   5. A decision on whether assessment *scores* cross the boundary at all, or
 *      only pass/fail. Scores on an HR record start to look like performance
 *      rating, which this project has deliberately excluded. FLAGGED.
 * ============================================================================
 */

export interface LndCompletion {
  /** Stable id in the L&D portal, so an entry can be traced back. */
  id: string;
  moduleId: string;
  moduleTitle: string;
  /** ISO date the person completed it. */
  completedOn: string;
  kind: 'training' | 'assessment';
  /** Only meaningful for assessments. */
  passed: boolean | null;
}

/** Invented completions, so the timeline has something true-shaped to show. */
const mockCompletions: Record<string, LndCompletion[]> = {
  'emp-008': [
    { id: 'lnd-1', moduleId: 'mod-stone-101', moduleTitle: 'Engineered stone: material basics', completedOn: '2024-02-14', kind: 'training', passed: null },
    { id: 'lnd-2', moduleId: 'mod-stone-101-a', moduleTitle: 'Material basics assessment', completedOn: '2024-02-20', kind: 'assessment', passed: true },
    { id: 'lnd-3', moduleId: 'mod-design-210', moduleTitle: 'Designing for slab yield', completedOn: '2025-06-03', kind: 'training', passed: null },
  ],
  'emp-016': [
    { id: 'lnd-4', moduleId: 'mod-safety-100', moduleTitle: 'Factory floor safety induction', completedOn: '2024-05-18', kind: 'training', passed: null },
    { id: 'lnd-5', moduleId: 'mod-safety-100-a', moduleTitle: 'Safety induction assessment', completedOn: '2024-05-18', kind: 'assessment', passed: true },
    { id: 'lnd-6', moduleId: 'mod-edge-140', moduleTitle: 'Edge polishing technique', completedOn: '2025-11-22', kind: 'training', passed: null },
  ],
  'emp-003': [
    { id: 'lnd-7', moduleId: 'mod-lead-300', moduleTitle: 'Leading a production team', completedOn: '2025-03-11', kind: 'training', passed: null },
    { id: 'lnd-8', moduleId: 'mod-safety-100', moduleTitle: 'Factory floor safety induction', completedOn: '2024-05-02', kind: 'training', passed: null },
  ],
  'emp-029': [
    { id: 'lnd-9', moduleId: 'mod-showroom-110', moduleTitle: 'Showroom floor induction', completedOn: '2026-06-09', kind: 'training', passed: null },
    { id: 'lnd-10', moduleId: 'mod-showroom-110-a', moduleTitle: 'Showroom induction assessment', completedOn: '2026-06-16', kind: 'assessment', passed: false },
  ],
  'emp-005': [
    { id: 'lnd-11', moduleId: 'mod-posh-200', moduleTitle: 'POSH: obligations of the Internal Committee', completedOn: '2026-04-20', kind: 'training', passed: null },
  ],
};

/**
 * Replace the body of this function with a call to the L&D portal. The return
 * type is the contract; nothing above this layer should change.
 */
export async function getLndCompletions(employeeId: string): Promise<LndCompletion[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return mockCompletions[employeeId] ?? [];
}

/** Whether the integration is actually wired. Screens say so plainly when not. */
export const LND_CONNECTED = false;
