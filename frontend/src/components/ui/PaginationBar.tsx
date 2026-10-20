import { Pagination } from 'antd';
import { palette } from '../../theme/tokens';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export const PaginationBar = ({ page, pageSize, total, onChange }: PaginationBarProps) => {
  if (total <= pageSize) return null;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: 24,
        padding: '12px 8px',
        borderRadius: 14,
        border: `1px solid ${palette.borderSoft}`,
        background: palette.surfaceMuted,
      }}
    >
      <Pagination
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        onChange={onChange}
        hideOnSinglePage
      />
    </div>
  );
};
