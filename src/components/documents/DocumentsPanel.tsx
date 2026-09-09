'use client';

import { useState } from 'react';
import { AsyncSection, Button, Card, EmptyState, Small } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { archiveDocument, getDocuments, uploadDocument } from '@/data/documents';
import { findEmployeeSync } from '@/data/directory';
import { useAsync } from '@/hooks/useAsync';
import { formatTimestamp } from '@/lib/date';
import { documentTypeLabels, documentVisibilityLabels } from '@/lib/labels';
import { canEditEmployeeFully, canViewPersonalData, isSelf } from '@/lib/permissions';
import type { DocumentType, DocumentVisibility } from '@/lib/types';
import s from './documents.module.css';

const typeEntries = Object.entries(documentTypeLabels) as Array<[DocumentType, string]>;
const visibilityEntries = Object.entries(documentVisibilityLabels) as Array<[DocumentVisibility, string]>;

export function DocumentsPanel({ employeeId }: { employeeId: string }) {
  const { user } = useCurrentUser();
  const [includeArchived, setIncludeArchived] = useState(false);
  const allowed = canViewPersonalData(user, employeeId);

  const { state, reload } = useAsync(
    () => getDocuments(user, employeeId, includeArchived),
    [user.employee.id, employeeId, includeArchived],
  );

  const canUpload = canEditEmployeeFully(user) || isSelf(user, employeeId);

  return (
    <Card
      title="Documents"
      hint="Grouped by type. Records are archived, never deleted."
      actions={
        <Button variant="quiet" onClick={() => setIncludeArchived((v) => !v)}>
          {includeArchived ? 'Hide archived' : 'Show archived'}
        </Button>
      }
    >
      <AsyncSection
        state={state}
        reload={reload}
        allowed={allowed}
        deniedLabel="these documents"
        isEmpty={(groups) => groups.length === 0}
        empty={
          <EmptyState
            title="No documents you can see"
            body="Identity, education and payroll documents are visible to HR only."
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
                      <li key={doc.id} className={`${s.item} ${doc.archived ? s.archived : ''}`}>
                        <div className={s.itemMain}>
                          <span className={s.fileName}>{doc.fileName}</span>
                          <span className={s.meta}>
                            Uploaded by {uploader?.fullName ?? doc.uploadedBy} on{' '}
                            {formatTimestamp(doc.uploadedOn)} · {documentVisibilityLabels[doc.visibility]}
                            {doc.archived ? ' · Archived' : ''}
                          </span>
                        </div>
                        <div className={s.itemActions}>
                          <Button variant="quiet" onClick={() => window.alert('No file store is wired up in this pass — there is nothing to download yet.')}>
                            Download
                          </Button>
                          {!doc.archived && canEditEmployeeFully(user) ? (
                            <Button variant="quiet" onClick={() => void archiveDocument(doc.id)}>
                              Archive
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </AsyncSection>

      {allowed && canUpload ? <UploadForm employeeId={employeeId} /> : null}
    </Card>
  );
}

function UploadForm({ employeeId }: { employeeId: string }) {
  const { user } = useCurrentUser();
  const [type, setType] = useState<DocumentType>('other');
  const [visibility, setVisibility] = useState<DocumentVisibility>('employee');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!fileName.trim()) return;
    setBusy(true);
    try {
      await uploadDocument({
        employeeId,
        type,
        fileName: fileName.trim(),
        uploadedBy: user.employee.id,
        visibility,
      });
      setFileName('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.uploadForm}>
      <div className={s.field}>
        <label className={s.label} htmlFor="doc-file">
          File
        </label>
        <input
          id="doc-file"
          type="text"
          placeholder="e.g. address-proof.pdf"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
      </div>
      <div className={s.field}>
        <label className={s.label} htmlFor="doc-type">
          Type
        </label>
        <select id="doc-type" value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
          {typeEntries.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className={s.field}>
        <label className={s.label} htmlFor="doc-visibility">
          Visibility
        </label>
        <select
          id="doc-visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as DocumentVisibility)}
        >
          {visibilityEntries.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <Button onClick={submit} disabled={busy || fileName.trim().length === 0}>
        Add document
      </Button>
      <p className={s.note}>
        <Small>
          There is no file storage in this pass — this records the file name, type, uploader and date
          only, so the list behaviour can be reviewed.
        </Small>
      </p>
    </div>
  );
}
