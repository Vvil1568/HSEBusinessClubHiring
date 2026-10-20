import { CheckOutlined, FilterOutlined, SortAscendingOutlined } from '@ant-design/icons';
import { Button, Drawer, Divider, Radio, Space } from 'antd';
import type { VacancySort } from '../../../types';
import { palette } from '../../../theme/tokens';

interface VacancyFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  titles: string[];
  selectedTitles: string[];
  onToggleTitle: (title: string) => void;
  onResetTitles: () => void;
  sortBy: VacancySort;
  onSortChange: (sort: VacancySort) => void;
}

const sortOptions: Array<{ value: VacancySort; label: string }> = [
  { value: 'new', label: 'Сначала новые' },
  { value: 'views', label: 'По просмотрам' },
  { value: 'applications', label: 'По откликам' },
];

export const VacancyFilterDrawer = ({
  open,
  onClose,
  titles,
  selectedTitles,
  onToggleTitle,
  onResetTitles,
  sortBy,
  onSortChange,
}: VacancyFilterDrawerProps) => {
  const hasTitles = titles.length > 0;

  return (
    <Drawer
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <FilterOutlined /> Фильтр и сортировка
        </span>
      }
      placement="right"
      open={open}
      onClose={onClose}
      width={360}
      styles={{ body: { background: palette.background }, header: { background: palette.background } }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <Button onClick={onResetTitles} disabled={selectedTitles.length === 0}>
            Сбросить фильтр
          </Button>
          <Button type="primary" onClick={onClose}>
            Применить
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ color: palette.textSecondary, fontSize: 13, fontWeight: 600 }}>
          Название вакансии
        </span>
        <span style={{ color: palette.textMuted, fontSize: 12 }}>
          Выберите одно или несколько названий — результаты объединяются по принципу ИЛИ.
        </span>
        {!hasTitles ? (
          <span style={{ color: palette.textMuted, fontSize: 13 }}>
            Список названий пока пуст.
          </span>
        ) : (
          <Space size={[8, 8]} wrap style={{ marginTop: 4 }}>
            {titles.map((title) => {
              const isActive = selectedTitles.includes(title);
              return (
                <button
                  key={title}
                  type="button"
                  onClick={() => onToggleTitle(title)}
                  aria-pressed={isActive}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: 13,
                    cursor: 'pointer',
                    color: isActive ? palette.text : palette.textSecondary,
                    border: `1px solid ${isActive ? palette.primaryHover : palette.border}`,
                    background: isActive ? `${palette.primary}33` : palette.surfaceMuted,
                  }}
                >
                  {isActive ? <CheckOutlined style={{ fontSize: 11 }} /> : null}
                  {title}
                </button>
              );
            })}
          </Space>
        )}
      </div>

      <Divider style={{ borderColor: palette.borderSoft }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: palette.textSecondary,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <SortAscendingOutlined /> Сортировка
        </span>
        <Radio.Group
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value as VacancySort)}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {sortOptions.map((option) => (
            <Radio key={option.value} value={option.value}>
              {option.label}
            </Radio>
          ))}
        </Radio.Group>
      </div>
    </Drawer>
  );
};
