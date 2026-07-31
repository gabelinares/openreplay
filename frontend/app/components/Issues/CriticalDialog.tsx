import { Button, Input, Modal, Tooltip } from 'antd';
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
     · none of mine matched → the field, prefilled from the issue so a rule is
       one edit away from blank, footer is Cancel / Save.
   Whenever the issue IS critical, the footer's left holds the way out. It acts
   immediately, no confirmation (Gabriel 07-31) — so the thing a confirm step
   would have explained lives in the button's tooltip instead: the issue leaves
   YOUR critical list, the description itself is untouched. The row menu offers
   the way back. The path to the full list is the header's Settings button.
   The same action with a reason attached still lives in the row menu and the
   detail page's action bar (NotCriticalDialog), where there is room to ask. */
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

  /** removes this issue from my critical list, immediately — no confirmation
      (Gabriel 07-31). Nothing is lost that a click cannot restore: my
      description stays exactly as it is and keeps flagging everything else it
      matches, and the row menu offers "Show as critical again". */
  const removeFromCritical = () => {
    if (issueId == null) return;
    issuesStore.setNotCriticalForMe(issueId, '');
    onClose();
  };

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
      /* one footer for every state: the way OUT of critical on the left, the
         conventional place for a secondary exit, and the primary on the right.
         Explaining has nothing to confirm, so Save is simply absent there. */
      footer={(_, { OkBtn, CancelBtn }) => (
        <div className="flex items-center">
          {matched.length > 0 && (
            <Tooltip
              placement="topLeft"
              title={
                hasMine
                  ? 'Removes this issue from your critical list. Your description stays and keeps flagging everything else it matches.'
                  : 'Removes this issue from your critical list. Your teammate’s description is untouched, and their view does not change.'
              }
            >
              <Button type="text" danger onClick={removeFromCritical}>
                Not critical for me
              </Button>
            </Tooltip>
          )}
          <span className="ml-auto flex items-center gap-2">
            <CancelBtn />
            {!hasMine && <OkBtn />}
          </span>
        </div>
      )}
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
