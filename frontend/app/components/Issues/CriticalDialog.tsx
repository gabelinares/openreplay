import { Input, Modal } from 'antd';
import { AlertTriangle } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';

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
   description is authored HERE, in place.

   ONE JOB, ONE FOOTER (Gabriel 07-31). The first build put three choices in the
   body — a manage link, a destructive action and a hidden OK — and you could not
   tell what the dialog was for. So the body only ever holds the quoted issue
   plus ONE of two things, and the buttons live in the footer where the Hide
   modal keeps them:
     · a description already matched → it says which and whose, footer is Close.
       Pure explanation, nothing to confirm.
     · none of mine matched → the field, prefilled from the issue so a rule is
       one edit away from blank, footer is Cancel / Save.
   Everything else moved to where the app already keeps it: "not critical for me"
   to the row menu and the detail page's action bar (NotCriticalDialog), and the
   way to the full list to the header's Settings button. */
export default observer(function CriticalDialog({
  issueId,
  issueHead,
  onClose,
}: {
  /** null closes it */
  issueId: number | null;
  issueHead: string;
  onClose: () => void;
}) {
  const { issuesStore } = useStore();
  const [desc, setDesc] = React.useState('');

  const open = issueId != null;
  const matched = open ? issuesStore.matchedRules(issueId) : [];
  const hasMine = matched.some((r) => r.mine);
  // prefilled from the issue, so the description starts as something real
  React.useEffect(() => {
    if (open) setDesc(hasMine ? '' : issueHead);
  }, [open, issueHead, hasMine]);

  const save = () => {
    if (issueId == null || !desc.trim()) return;
    issuesStore.addCriticalRule(desc.trim(), issueId);
    onClose();
  };

  return (
    <Modal
      title={hasMine ? 'Why this is critical' : 'What makes this critical?'}
      open={open}
      onCancel={onClose}
      onOk={save}
      okText="Save"
      okButtonProps={{ disabled: !desc.trim() }}
      // explaining has nothing to confirm, so the footer is a single Close
      footer={
        hasMine ? (_, { CancelBtn }) => <CancelBtn /> : undefined
      }
      cancelText={hasMine ? 'Close' : 'Cancel'}
    >
      <p className="mb-3" style={{ color: 'var(--color-gray-dark)' }}>
        “{issueHead}”
      </p>

      {matched.length > 0 && (
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

      {!hasMine && (
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
    </Modal>
  );
});
