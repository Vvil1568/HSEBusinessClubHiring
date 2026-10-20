import { FileAddOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Button, Empty, Modal, Select } from 'antd';
import { useState } from 'react';
import type { VacancyTemplate } from '../../../types';
import { palette } from '../../../theme/tokens';

interface TemplatePickerProps {
  open: boolean;
  templates: VacancyTemplate[];
  loading: boolean;
  onSelectTemplate: (template: VacancyTemplate) => void;
  onCreateBlank: () => void;
  onClose: () => void;
}

export const TemplatePicker = ({
  open,
  templates,
  loading,
  onSelectTemplate,
  onCreateBlank,
  onClose,
}: TemplatePickerProps) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const selected = templates.find((template) => template.id === selectedId);

  const handleAdd = () => {
    if (selected) {
      onSelectTemplate(selected);
      setSelectedId(undefined);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Добавить вакансию"
      width={560}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <Button
            icon={<FileAddOutlined />}
            onClick={() => {
              onCreateBlank();
              setSelectedId(undefined);
              onClose();
            }}
          >
            Создать новую
          </Button>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={onClose}>Отмена</Button>
            <Button type="primary" disabled={!selected} onClick={handleAdd}>
              Добавить из шаблона
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ color: palette.textSecondary, fontSize: 13 }}>
          Выберите шаблон — поля вакансии заполнятся автоматически, их можно изменить.
        </span>
        <Select
          style={{ width: '100%' }}
          placeholder="Шаблон вакансии"
          loading={loading}
          value={selectedId}
          onChange={setSelectedId}
          options={templates.map((template) => ({
            value: template.id,
            label: template.title,
          }))}
          notFoundContent={
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Шаблоны не найдены"
              style={{ margin: '8px 0' }}
            />
          }
        />
        {selected ? (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              background: palette.surfaceMuted,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 13,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: palette.primaryHover }}>
              <ThunderboltOutlined /> {selected.title}
            </span>
            <span style={{ color: palette.textSecondary }}>{selected.description}</span>
            <span style={{ color: palette.textMuted }}>
              <b style={{ color: palette.textSecondary }}>Требования:</b> {selected.requirements}
            </span>
            <span style={{ color: palette.textMuted }}>
              <b style={{ color: palette.textSecondary }}>Вознаграждение:</b> {selected.reward}
            </span>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
