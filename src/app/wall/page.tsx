'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  AsyncSection,
  Avatar,
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Person,
} from '@/components/ui';
import { IconComment, IconHeart } from '@/components/ui/icons';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { findEmployeeSync } from '@/data/directory';
import { commentOnPost, createPost, getPosts, toggleReaction } from '@/data/workplace';
import { useAsync } from '@/hooks/useAsync';
import { formatTimestamp } from '@/lib/date';
import type { Post, ReactionType } from '@/lib/types';
import s from './wall.module.css';

const REACTIONS: Array<{ type: ReactionType; label: string }> = [
  { type: 'like', label: 'Like' },
  { type: 'celebrate', label: 'Celebrate' },
  { type: 'support', label: 'Support' },
];

function WallFeed() {
  const { user } = useCurrentUser();
  const params = useSearchParams();
  const wishFor = params.get('wish');
  const wishKind = params.get('kind');
  const { state, reload } = useAsync(() => getPosts(), []);

  const wishTarget = findEmployeeSync(wishFor);
  const prefill = wishTarget
    ? wishKind === 'anniversary'
      ? `Congratulations ${wishTarget.fullName.split(' ')[0]} on another year with us.`
      : `Happy birthday ${wishTarget.fullName.split(' ')[0]}.`
    : '';

  return (
    <>
      <PageHeader
        title="Wall"
        description="What is going on across Magppie. Newest first."
      />

      <Composer prefill={prefill} />

      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <Card>
            <EmptyState
              title="Nothing on the wall yet"
              body="Posts from anyone in the company show up here — a finished kitchen, a new joiner, something people should see."
            />
          </Card>
        }
        loadingRows={4}
      >
        {(rows) => (
          <div className={s.feed}>
            {rows.map((post) => (
              <PostCard key={post.id} post={post} viewerId={user.employee.id} />
            ))}
          </div>
        )}
      </AsyncSection>
    </>
  );
}

function Composer({ prefill }: { prefill: string }) {
  const { user } = useCurrentUser();
  const [body, setBody] = useState(prefill);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(Boolean(prefill));

  const post = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await createPost(user.employee.id, body.trim(), caption.trim() || null);
      setBody('');
      setCaption('');
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      {open ? (
        <div className={s.composer}>
          <div className={s.composerHead}>
            <Avatar name={user.employee.fullName} />
            <textarea
              value={body}
              autoFocus
              placeholder="Say something to the company"
              aria-label="Post text"
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <input
            type="text"
            value={caption}
            placeholder="Image caption (there is no file upload in this pass)"
            aria-label="Image caption"
            onChange={(e) => setCaption(e.target.value)}
          />
          <div className={s.composerActions}>
            <Button variant="primary" onClick={post} disabled={busy || !body.trim()}>
              {busy ? 'Posting…' : 'Post'}
            </Button>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" className={s.composerPrompt} onClick={() => setOpen(true)}>
          <Avatar name={user.employee.fullName} />
          <span>Say something to the company…</span>
        </button>
      )}
    </Card>
  );
}

function PostCard({ post, viewerId }: { post: Post; viewerId: string }) {
  const author = findEmployeeSync(post.authorId);
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(post.comments.length > 0);
  const [busy, setBusy] = useState(false);

  const addComment = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await commentOnPost(post.id, viewerId, comment.trim());
      setComment('');
    } finally {
      setBusy(false);
    }
  };

  const totalReactions = post.reactions.reduce((n, r) => n + r.employeeIds.length, 0);

  return (
    <article className={s.post}>
      <header className={s.postHead}>
        <Person
          name={author?.fullName ?? post.authorId}
          href={author ? `/directory/${author.id}` : undefined}
          secondary={`${author?.designation ?? ''} · ${formatTimestamp(post.postedOn)}`}
        />
      </header>

      <p className={s.postBody}>{post.body}</p>

      {post.image ? (
        <div className={s.postImage}>
          <span className={s.postImageLabel}>Image</span>
          <span>{post.image}</span>
          <span className={s.postImageNote}>
            There is no file storage in this pass, so the caption stands in for the picture.
          </span>
        </div>
      ) : null}

      <div className={s.reactions}>
        {REACTIONS.map(({ type, label }) => {
          const group = post.reactions.find((r) => r.type === type);
          const mine = group?.employeeIds.includes(viewerId) ?? false;
          const count = group?.employeeIds.length ?? 0;
          return (
            <button
              key={type}
              type="button"
              className={`${s.reaction} ${mine ? s.reactionMine : ''}`}
              aria-pressed={mine}
              onClick={() => void toggleReaction(post.id, viewerId, type)}
            >
              <IconHeart size={15} />
              {label}
              {count > 0 ? <span className={s.reactionCount}>{count}</span> : null}
            </button>
          );
        })}
        <button type="button" className={s.reaction} onClick={() => setShowComments((v) => !v)}>
          <IconComment size={15} />
          {post.comments.length} comment{post.comments.length === 1 ? '' : 's'}
        </button>
        {totalReactions > 0 ? (
          <span className={s.reactionSummary}>
            {totalReactions} reaction{totalReactions === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {showComments ? (
        <div className={s.comments}>
          {post.comments.length === 0 ? (
            <p className={s.commentEmpty}>No comments yet. Yours would be the first.</p>
          ) : (
            post.comments.map((c) => {
              const commenter = findEmployeeSync(c.authorId);
              return (
                <div key={c.id} className={s.comment}>
                  <Avatar name={commenter?.fullName ?? c.authorId} size="sm" />
                  <div className={s.commentBody}>
                    <span className={s.commentAuthor}>
                      {commenter?.fullName ?? c.authorId}
                      <span className={s.commentTime}>{formatTimestamp(c.postedOn)}</span>
                    </span>
                    <span>{c.body}</span>
                  </div>
                </div>
              );
            })
          )}
          <div className={s.commentForm}>
            <input
              type="text"
              value={comment}
              placeholder="Add a comment"
              aria-label="Add a comment"
              onChange={(e) => setComment(e.target.value)}
            />
            <Button onClick={addComment} disabled={busy || !comment.trim()}>
              {busy ? 'Posting…' : 'Comment'}
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function WallPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading the wall…" />}>
      <WallFeed />
    </Suspense>
  );
}
