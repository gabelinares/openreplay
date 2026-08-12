import { Input, Modal } from 'antd';
import React from 'react';

import { useStore } from 'App/mstore';
import { CRITICAL_REASONS } from 'App/mstore/issuesStore';

import { ReasonChip } from './ProblemCard';

/* THE "not critical for me" dialog — one component for the issues list and the
   detail page, which both offer the action from their own menu/button.

   It is deliberately NOT part of CriticalDialog: a dialog does one job here
   (Gabriel 07-31), and mixing an explanation, an authoring field and a
   destructive action into one body is what made that modal unreadable. This one
   asks a single question and puts its only action in the footer, the Issues Hide
   modal's grammar.

   Per-user by design (Gabriel 07-30): it suppresses the flag for me and the
   reason is what teaches the agent — a teammate's view is untouched. */
export default function NotCriticalDialog({
  issue,
  onClose,
}: {
  /** null closes it */
  issue: { id: number; head: string } | null;
  onClose: () => void;
}) {
  const { issuesStore } = useStore();
  const [reasons, setReasons] = React.useState<string[]>([]);
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (issue) {
      setReasons([]);
      setNote('');
    }
  }, [issue]);

  return (
    <Modal
      title="Not critical for you?"
      open={issue != null}
      onCancel={onClose}
      onOk={() => {
        if (issue)
          issuesStore.setNotCriticalForMe(
            issue.id,
            [...reasons, note.trim()].filter(Boolean).join(' · '),
          );
        onClose();
      }}
      okText="Not critical for me"
      okButtonProps={{ danger: true }}
    >
      <p className="mb-3" style={{ color: 'var(--color-gray-dark)' }}>
        “{issue?.head}” stops showing as critical for you. Teammates keep their
        own view, and your reason helps the agent learn.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {CRITICAL_REASONS.map((r) => (
          <ReasonChip
            key={r}
            label={r}
            checked={reasons.includes(r)}
            onChange={(on) =>
              setReasons((prev) =>
                on ? [...prev, r] : prev.filter((x) => x !== r),
              )
            }
          />
        ))}
      </div>
      <Input.TextArea
        rows={3}
        placeholder="Add a note (optional)…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </Modal>
  );
}
