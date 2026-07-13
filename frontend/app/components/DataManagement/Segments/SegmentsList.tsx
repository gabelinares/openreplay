import withPageTitle from '@/components/hocs/withPageTitle';
import { PlusOutlined } from '@ant-design/icons';
import withPermissions from 'HOCs/withPermissions';
import { Button, Empty, Switch, Table, type TableProps, Tag, Tooltip, message } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { Lock, Star, Users } from 'lucide-react';
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
  updatedAt: 'updatedAt',
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
  const { projectsStore, userStore, issuesStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const currentUserId = userStore.account.id;
  const buildShareUrl = (id: string) =>
    `https://${ENV.ORIGIN}/${siteId}${sessions()}?sid=${id}`;
  const columns: TableProps<Segment>['columns'] = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (text: string) => (
        <TextEllipsis maxWidth={'320px'} text={text} className="link" />
      ),
    },
    {
      title: t('Visibility'),
      key: 'visibility',
      render: (_: unknown, record: Segment) => {
        const isOwner =
          record.userId !== undefined &&
          String(record.userId) === String(currentUserId);
        return (
          <div className="flex items-center gap-1">
            {/* @ts-ignore */}
            <Tooltip
              title={
                record.isPublic
                  ? t('Visible to everyone on your team')
                  : t('Only visible to the segment owner')
              }
            >
              <Tag
                icon={
                  record.isPublic ? <Users size={12} /> : <Lock size={12} />
                }
                color="default"
                className="text-xs! px-2! py-0.5! m-0! whitespace-nowrap inline-flex! items-center! gap-1! cursor-help"
              >
                {record.isPublic ? t('Team') : t('Private')}
              </Tag>
            </Tooltip>
            {isOwner && (
              // @ts-ignore
              <Tooltip title={t("You're this segment's owner")}>
                <Tag
                  icon={<Star size={12} />}
                  color="gold"
                  className="text-xs! px-2! py-0.5! m-0! whitespace-nowrap inline-flex! items-center! gap-1! cursor-help"
                >
                  {t('Owner')}
                </Tag>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: t('Conditions'),
      dataIndex: 'filters',
      key: 'complexity',
      render: (filters: any[]) => (filters ? filters.length : 0),
    },
    {
      title: t('# Sessions'),
      dataIndex: 'sessionsCount',
      key: 'sessionsCount',
      render: (count: number) => (count ?? 0).toLocaleString(),
    },
    {
      title: t('# Users'),
      dataIndex: 'usersCount',
      key: 'usersCount',
      render: (count: number) => (count ?? 0).toLocaleString(),
    },
    {
      title: t('Updated At'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      sorter: true,
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (text: number) =>
        text ? new Date(text).toLocaleDateString() : '—',
    },
    /* capture columns (Mehdi 07-13: one merged list, no Traffic tab) — the
       same shared flag the Issues popover toggles. Sourced from issuesStore
       by id; rows the store doesn't know (non-mock API data) show a dash. */
    {
      title: t('Traffic'),
      key: 'traffic',
      width: 110,
      render: (_: unknown, record: Segment) => {
        const s = issuesStore.segmentById(Number(record.id));
        return s?.active ? (
          <Tooltip
            title={`~${s.sessionsPerDay.toLocaleString()} sessions analysed per day`}
          >
            <span className="tabular-nums cursor-help">~{s.trafficPct}%</span>
          </Tooltip>
        ) : (
          <span style={{ color: 'var(--color-gray-medium)' }}>—</span>
        );
      },
    },
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
