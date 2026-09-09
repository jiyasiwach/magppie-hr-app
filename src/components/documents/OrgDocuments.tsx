'use client';

import { AsyncSection, Card, EmptyState, Small } from '@/components/ui';
import { getOrgDocuments } from '@/data/documents';
import { findEmployeeSync } from '@/data/directory';
import { useAsync } from '@/hooks/useAsync';
import { formatTimestamp } from '@/lib/date';
import { documentTypeLabels } from '@/lib/labels';
import s from './documents.module.css';

/** Company-wide documents. Readable by everyone, owned by nobody. */
export function OrgDocuments() {
  const { state, reload } = useAsync(() => getOrgDocuments(), []);

  return (
    <Card title="Org documents" hint="Company-wide policies and forms, readable by everyone">
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(groups) => groups.length === 0}
        empty={
          <EmptyState
            title="No company documents yet"
            body="Policies, forms and handbooks published by HR will appear here."
          />
        }
      >
        {(groups) => (
          <div>
            {groups.map((group) => (
              <div key={group.type} className={s.group}>
                <h3 className={s.groupTitle}>{documentTypeLabels[group.type]}</h3>
                <ul className={s.list}>
                  {group.documents.map((doc) => {
                    const uploader = findEmployeeSync(doc.uploadedBy);
                    return (
                      <li key={doc.id} className={s.item}>
                        <div className={s.itemMain}>
                          <span className={s.fileName}>{doc.fileName}</span>
                          <span className={s.meta}>
                            Published by {uploader?.fullName ?? doc.uploadedBy} on{' '}
                            {formatTimestamp(doc.uploadedOn)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <p className={s.note} style={{ marginTop: 12 }}>
              <Small>
                There is no file storage in this pass, so these are records rather than downloadable
                files.
              </Small>
            </p>
          </div>
        )}
      </AsyncSection>
    </Card>
  );
}
