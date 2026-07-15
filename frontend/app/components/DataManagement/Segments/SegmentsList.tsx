import withPageTitle from '@/components/hocs/withPageTitle';
import { PlusOutlined } from '@ant-design/icons';
import withPermissions from 'HOCs/withPermissions';
import { Button, Empty, Switch, Table, type TableProps, Tag, Tooltip, message } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { Lock, Users } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { sessions } from 'App/routes';
import SimpleEmptyImage from 'Components/DataManagement/SimpleEmptyImage';
import { estimateFromSeeds } from 'Components/Issues/segments/segmentUtils';
import { CopyButton, TextEllipsis } from 'UI';

import FullPagination from 'Shared/FullPagination';

import ENV from '../../../../env';

import type { Segment } from './api';

type SortBy = 'name' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const columnKeyToSortBy: Record<string, SortBy> = {
  name: 'name',
};

function SegmentsList({
  list,
  page,
  onPageChange,
  onSortChange,
  limit,
  toSegment,
  toCreate,
  isPending,
  total,
  listLen,
}: {
  list: Segment[];
  page: number;
  limit: number;
  total: number;
  listLen: number;
  isPending: boolean;
  onPageChange: (page: number) => void;
  onSortChange: (field: SortBy, order: SortOrder) => void;
  toSegment: (id: string) => void;
  toCreate: () => void;
}) {
  const { t } = useTranslation();
  const { projectsStore, issuesStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const buildShareUrl = (id: string) =>
    `https://${ENV.ORIGIN}/${siteId}${sessions()}?sid=${id}`;
  // same compact notation as the Events page (Mehdi 07-13: tables read in K,
  // exact numbers live in the detail view)
  const numberFormatter = Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  });

  const columns: TableProps<Segment>['columns'] = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      // plain name — the creator + update-time meta line moved into the
      // drawer's creator block (Mehdi 07-15: "inside the modal, bigger")
      render: (text: string) => (
        <TextEllipsis maxWidth={'320px'} text={text} className="link" />
      ),
    },
    {
      // Team/Private only — no Owner tag (Mehdi 07-13: "owner" is reserved
      // jargon for the account owner; the name meta line already says whose
      // segment it is)
      title: t('Visibility'),
      key: 'visibility',
      render: (_: unknown, record: Segment) => (
        <div className="flex items-center gap-1">
          {/* @ts-ignore */}
          <Tooltip
            title={
              record.isPublic
                ? t('Visible to everyone on your team')
                : t('Only visible to its creator')
            }
          >
            <Tag
              icon={record.isPublic ? <Users size={12} /> : <Lock size={12} />}
              color="default"
              className="text-xs! px-2! py-0.5! m-0! whitespace-nowrap inline-flex! items-center! gap-1! cursor-help"
            >
              {record.isPublic ? t('Team') : t('Private')}
            </Tag>
          </Tooltip>
        </div>
      ),
    },
    {
      // Sessions + Traffic merged into one column (Mehdi 07-15): the compact
      // count is the primary value (same as the other DM volume columns); the
      // traffic share follows inline in gray — only while the segment is
      // capturing, so idle rows stay a single clean number. One line, not
      // stacked (Gabriel 07-15: keep the row height down). The per-day
      // detail keeps living in the tooltip. Store lookup as before: rows the
      // issuesStore doesn't know (non-mock API data) just show the count.
      title: t('# Sessions'),
      dataIndex: 'sessionsCount',
      key: 'sessionsCount',
      render: (count: number, record: Segment) => {
        const s = issuesStore.segmentById(Number(record.id));
        return (
          <span className="whitespace-nowrap">
            <span className="tabular-nums">
              {numberFormatter.format(count ?? 0)}
            </span>
            {s?.active && (
              <Tooltip
                title={`~${s.sessionsPerDay.toLocaleString()} sessions analysed per day`}
              >
                <span
                  className="text-xs cursor-help"
                  style={{ color: 'var(--color-gray-medium)' }}
                >
                  {' '}
                  · ~{s.trafficPct}% {t('of traffic')}
                </span>
              </Tooltip>
            )}
          </span>
        );
      },
    },
    {
      title: t('# Users'),
      dataIndex: 'usersCount',
      key: 'usersCount',
      render: (count: number) => numberFormatter.format(count ?? 0),
    },
    /* capture column (Mehdi 07-13: one merged list, no Traffic tab) — the
       same shared flag the Issues popover toggles. Sourced from issuesStore
       by id; rows the store doesn't know (non-mock API data) show a dash. */
    {
      title: t('Capture'),
      key: 'capture',
      width: 90,
      render: (_: unknown, record: Segment) => {
        const s = issuesStore.segmentById(Number(record.id));
        if (!s) return <span style={{ color: 'var(--color-gray-medium)' }}>—</span>;
        const control = (
          <div onClick={(e) => e.stopPropagation()} className="inline-flex">
            <Switch
              size="small"
              checked={s.active}
              disabled={!s.isPublic}
              aria-label={`${s.name} — capture ${s.active ? 'on' : 'off'}`}
              onChange={(on) => {
                // switching on recomputes the estimate from the live pool
                if (on) issuesStore.enableCapture(s.id, estimateFromSeeds(s.seeds));
                else if (issuesStore.toggleSegment(s.id, false))
                  message.info(
                    t('No active segments left — capture switched to full traffic.'),
                  );
              }}
            />
          </div>
        );
        return s.isPublic ? (
          control
        ) : (
          <Tooltip
            title={t(
              'Private segments can’t capture traffic — only team-visible ones are eligible (everyone must be able to stop a capture).',
            )}
          >
            {control}
          </Tooltip>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: Segment) => (
        <div onClick={(e) => e.stopPropagation()}>
          <CopyButton
            isIcon
            isShare
            content={buildShareUrl(record.id)}
            copyText={[t('Share Segment'), t('Link Copied!')]}
          />
        </div>
      ),
    },
  ];

  const handleTableChange: TableProps<Segment>['onChange'] = (
    _pagination,
    _filters,
    sorter,
  ) => {
    const s = sorter as SorterResult<Segment>;
    const field = columnKeyToSortBy[s.columnKey as string] ?? 'updatedAt';
    const order: SortOrder = s.order === 'ascend' ? 'asc' : 'desc';
    onSortChange(field, order);
  };

  const emptyState = (
    <Empty
      image={<SimpleEmptyImage />}
      description={
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="text-base font-medium">{t('No segments')}</div>
          <div className="text-disabled-text max-w-md">
            {t(
              'Segments are a reusable collection of events and filters that you can save and apply later to search for sessions.',
            )}
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={toCreate}
            className="mt-1"
          >
            {t('Create Segment')}
          </Button>
        </div>
      }
    />
  );

  return (
    <>
      <Table
        columns={columns}
        dataSource={list}
        pagination={false}
        scroll={{ x: 'max-content' }}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => toSegment(record.id),
        })}
        rowHoverable
        rowClassName={'cursor-pointer'}
        loading={isPending}
        onChange={handleTableChange}
        locale={{ emptyText: isPending ? null : emptyState }}
      />
      <FullPagination
        page={page}
        limit={limit}
        total={total}
        listLen={listLen}
        onPageChange={onPageChange}
        entity={'segments'}
      />
    </>
  );
}

export default withPageTitle('Segments')(
  withPermissions(['DATA_MANAGEMENT'], '', false, false)(observer(SegmentsList)),
);
