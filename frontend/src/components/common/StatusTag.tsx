import { Tag } from 'antd';
import type { ApplicationStatus } from '../../types';
import { statusColors, statusLabels } from '../../theme/tokens';

interface StatusTagProps {
  status: ApplicationStatus;
}

export const StatusTag = ({ status }: StatusTagProps) => (
  <Tag
    style={{
      margin: 0,
      borderRadius: 999,
      borderColor: statusColors[status],
      color: statusColors[status],
      background: `${statusColors[status]}1A`,
      fontSize: 12,
      paddingInline: 10,
    }}
  >
    {statusLabels[status]}
  </Tag>
);
