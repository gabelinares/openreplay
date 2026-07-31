import { Button, Input, Modal } from 'antd';
import { AlertTriangle } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { CRITICAL_REASONS } from 'App/mstore/issuesStore';

import { ReasonChip } from './ProblemCard';

/** The description field + its expectation caption. Shared with the manager in
 *  Preferences so the two places you can author a description are literally the
 *  same field, not two that happen to match today. */
export function CriticalRuleFields({
  value,
  onChange,
  caption,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  caption: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Input.TextArea
        autoFocus={autoFocus}
        rows={3}
        maxLength={300}
        placeholder="e.g. Anything that stops someone paying: declined cards, failed charges, or a payment form that rejects valid details."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
        {caption}
      </span>
    </div>
  );
}

/* THE critical dialog — the intermediary layer for criticality.

   Mehdi 07-28: clicking critical no longer flags the issue, it takes you to
   where you "describe what is critical for you", and every description carries
   its author so "critical to me" can filter by it. Gabriel argued that sending
   someone from a small triangle straight into a settings page breaks the flow,
   and Mehdi agreed ("we need something intermediary. Yes. Correct."), so the
   description is authored HERE, in place, with a way through to the full list.

   One dialog, two jobs, because they are the same question asked from either
   side of the flag:
     · already critical → it says WHICH descriptions matched and whose, which is
       the only honest answer to "why is this flagged?" now that the agent
       decides. If none of them are mine, adding my own is offered right there.
     · not critical → author the description that makes it so, prefilled from
       the issue's own title so it is one edit away from a real rule rather
       than a blank field.

   Dialog grammar is the app's (Issues Hide modal): no icon, default width,
   the subject quoted in a gray body line, expectation set in a caption. */
export default observer(function CriticalDialog({
  issueId,
  issueHead,
  onClose,
  onManage,
}: {
  /** null closes it */
  issueId: number | null;
  issueHead: string;
  onClose: () => void;
  /** the way through to the full list in Preferences > Agents */
  onManage?: () => void;
}) {
  const { issuesStore } = useStore();
  const [desc, setDesc] = React.useState('');
  // second step: saying it is not critical for me, where the reason is the
  // agent's feedback. Reachable from every surface because the control always
  // opens this dialog, so no page needs its own copy of the reason picker.
  const [unsetting, setUnsetting] = React.useState(false);
  const [reasons, setReasons] = React.useState<string[]>([]);
  const [note, setNote] = React.useState('');

  const open = issueId != null;
  const matched = open ? issuesStore.matchedRules(issueId) : [];
  const hasMine = matched.some((r) => r.mine);
  // prefilled from the issue, so the description starts as something real
  React.useEffect(() => {
    if (open) {
      setDesc(hasMine ? '' : issueHead);
      setUnsetting(false);
      setReasons([]);
      setNote('');
    }
  }, [open, issueHead, hasMine]);

  const save = () => {
    if (issueId == null) return;
    if (unsetting) {
      issuesStore.setNotCriticalForMe(
        issueId,
        [...reasons, note.trim()].filter(Boolean).join(' · '),
      );
      onClose();
      return;
    }
    if (!desc.trim()) return;
    issuesStore.addCriticalRule(desc.trim(), issueId);
    onClose();
  };

  const title = unsetting
    ? 'Not critical for you?'
    : matched.length
      ? 'Why this is critical'
      : 'What makes this critical?';

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      onOk={save}
      okText={unsetting ? 'Not critical for me' : 'Save'}
      okButtonProps={{
        danger: unsetting,
        disabled: unsetting ? false : !desc.trim() || hasMine,
        // nothing to confirm when the dialog is purely an explanation
        style: !unsetting && hasMine ? { display: 'none' } : undefined,
      }}
      cancelText={hasMine && !unsetting ? 'Close' : 'Cancel'}
    >
      <p className="mb-3" style={{ color: 'var(--color-gray-dark)' }}>
        {unsetting ? (
          <>
            “{issueHead}” stops showing as critical for you. Teammates keep their
            own view, and your reason helps the agent learn.
          </>
        ) : (
          <>“{issueHead}”</>
        )}
      </p>

      {unsetting && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
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
            rows={2}
            placeholder="Add a note (optional)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}

      {!unsetting && matched.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {matched.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-2.5 rounded-lg border p-3"
            >
              <AlertTriangle
                size={15}
                className="mt-0.5 shrink-0"
                style={{ color: 'var(--color-red)' }}
              />
              <div className="flex flex-col gap-0.5">
                <span>{r.description}</span>
                <span
                  className="text-sm"
                  style={{ color: 'var(--color-gray-medium)' }}
                >
                  {r.mine ? 'Your description' : `${r.createdBy}’s description`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!unsetting && !hasMine && (
        <div className="flex flex-col gap-3">
          <span style={{ color: 'var(--color-gray-dark)' }}>
            {matched.length
              ? 'Describe it in your own words to make it critical for you too.'
              : 'Describe what makes issues like this critical. The agent reads your description and flags what matches, so this is a rule, not a one-off.'}
          </span>
          <CriticalRuleFields
            autoFocus
            value={desc}
            onChange={setDesc}
            caption="This issue is flagged straight away. Anything else it matches is flagged as the agent reviews new sessions."
          />
        </div>
      )}

      {!unsetting && (
        <div className="flex items-center gap-3 mt-1">
          {onManage && (
            /* the quiet link grammar the tag dialog uses for the same job */
            <Button
              type="link"
              size="small"
              onClick={onManage}
              className="px-0!"
            >
              Manage what’s critical
            </Button>
          )}
          {matched.length > 0 && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => setUnsetting(true)}
              className="px-0! ml-auto"
            >
              Not critical for me
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
});
