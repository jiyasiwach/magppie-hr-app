'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  AsyncSection,
  Card,
  EmptyState,
  LoadingState,
  Muted,
  PageHeader,
  Small,
  StatusPill,
} from '@/components/ui';
import { getManagerChain, getReportingTree, type TreeNode } from '@/data/directory';
import { useAsync } from '@/hooks/useAsync';
import { employeeStatusLabels, employeeStatusTones } from '@/lib/labels';
import { employees } from '@/mocks';
import s from './tree.module.css';

function Node({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const count = node.reports.length;

  return (
    <li className={s.node}>
      <div className={s.nodeRow}>
        {count > 0 ? (
          <button
            type="button"
            className={s.toggle}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? '−' : '+'}
          </button>
        ) : (
          <span className={s.toggleSpacer} aria-hidden="true" />
        )}
        <div className={s.nodeBody}>
          <Link href={`/directory/${node.employee.id}`}>{node.employee.fullName}</Link>
          <span className={s.nodeMeta}>
            {node.employee.designation} · {node.employee.department}
          </span>
        </div>
        <div className={s.nodeRight}>
          {node.employee.status !== 'active' ? (
            <StatusPill
              label={employeeStatusLabels[node.employee.status]}
              tone={employeeStatusTones[node.employee.status]}
            />
          ) : null}
          {count > 0 ? (
            <Muted>
              <Small>
                {count} report{count === 1 ? '' : 's'}
              </Small>
            </Muted>
          ) : null}
        </div>
      </div>
      {open && count > 0 ? (
        <ul className={s.children}>
          {node.reports.map((child) => (
            <Node key={child.employee.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function TreeView() {
  const params = useSearchParams();
  const [root, setRoot] = useState(params.get('root') ?? 'emp-001');

  const treeQuery = useAsync(() => getReportingTree(root), [root]);
  const chainQuery = useAsync(() => getManagerChain(root), [root]);

  const sorted = [...employees].sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <>
      <PageHeader
        title="Reporting tree"
        description="Start from anyone. Someone with no manager sits at the top of their own tree; someone with many reports simply has a long list."
      />

      <Card>
        <label className={s.pickerLabel} htmlFor="tree-root">
          Start from
        </label>
        <select id="tree-root" value={root} onChange={(e) => setRoot(e.target.value)} className={s.picker}>
          {sorted.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName} — {e.designation}
            </option>
          ))}
        </select>

        <div className={s.above}>
          <AsyncSection state={chainQuery.state} reload={chainQuery.reload} loadingRows={1}>
            {(chain) =>
              chain.length === 0 ? (
                <Muted>
                  <Small>No manager above this person.</Small>
                </Muted>
              ) : (
                <Muted>
                  <Small>
                    Above: {chain.map((m) => m.fullName).reverse().join(' → ')} →{' '}
                  </Small>
                </Muted>
              )
            }
          </AsyncSection>
        </div>
      </Card>

      <div className={s.treeCard}>
        <Card flush>
          <AsyncSection
            state={treeQuery.state}
            reload={treeQuery.reload}
            isEmpty={(node) => node === null}
            empty={<EmptyState title="No such person" />}
          >
            {(node) =>
              node ? (
                <ul className={s.tree}>
                  <Node node={node} depth={0} />
                  {node.reports.length === 0 ? (
                    <li className={s.leafNote}>
                      <Muted>
                        <Small>Nobody reports to this person.</Small>
                      </Muted>
                    </li>
                  ) : null}
                </ul>
              ) : null
            }
          </AsyncSection>
        </Card>
      </div>
    </>
  );
}

export default function ReportingTreePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading reporting tree…" />}>
      <TreeView />
    </Suspense>
  );
}
