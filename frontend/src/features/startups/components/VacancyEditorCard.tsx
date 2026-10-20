import {
  BarChartOutlined,
  CloseOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { Button, Input, Tooltip } from 'antd';
import { palette } from '../../../theme/tokens';
import { useDraftState } from '../../../hooks/useDraftState';
import type { VacancyInput } from '../../../types';

interface VacancyEditorCardProps {
  vacancy: VacancyInput;
  index: number;
  draftKey: string;
  onChange: (vacancy: VacancyInput) => void;
  onRemove: () => void;
  onOpenStats?: () => void;
}

export const VacancyEditorCard = ({
  vacancy,
  index,
  draftKey,
  onChange,
  onRemove,
  onOpenStats,
}: VacancyEditorCardProps) => {
  const [description, setDescription] = useDraftState(
    `${draftKey}:description`,
    vacancy.description,
  );
  const [requirements, setRequirements] = useDraftState(
    `${draftKey}:requirements`,
    vacancy.requirements,
  );
  const [reward, setReward] = useDraftState(`${draftKey}:reward`, vacancy.reward);

  const updateField = (patch: Partial<VacancyInput>) => onChange({ ...vacancy, ...patch });

  return (
    <section
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 18,
        borderRadius: 16,
        border: `1px solid ${vacancy.isHidden ? palette.warning : palette.border}`,
        background: palette.surface,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 76 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 8,
            background: palette.surfaceElevated,
            color: palette.textSecondary,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {index + 1}
        </span>
        <span style={{ fontSize: 12, color: palette.textMuted, letterSpacing: 0.4 }}>
          ВАКАНСИЯ
        </span>
        {vacancy.isHidden ? (
          <span style={{ fontSize: 11, color: palette.warning }}>
            скрыта из общего списка
          </span>
        ) : null}
      </div>

      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4 }}>
        <Tooltip title="Статистика вакансии">
          <Button
            type="text"
            size="small"
            aria-label="Статистика вакансии"
            icon={<BarChartOutlined />}
            disabled={!vacancy.id}
            onClick={onOpenStats}
          />
        </Tooltip>
        <Tooltip title={vacancy.isHidden ? 'Показать вакансию' : 'Скрыть вакансию'}>
          <Button
            type="text"
            size="small"
            aria-label={vacancy.isHidden ? 'Показать вакансию' : 'Скрыть вакансию'}
            icon={vacancy.isHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => updateField({ isHidden: !vacancy.isHidden })}
          />
        </Tooltip>
        <Tooltip title="Удалить вакансию">
          <Button
            type="text"
            size="small"
            danger
            aria-label="Удалить вакансию"
            icon={<CloseOutlined />}
            onClick={onRemove}
          />
        </Tooltip>
      </div>

      <Input
        value={vacancy.title}
        onChange={(event) => updateField({ title: event.target.value })}
        placeholder="Название вакансии"
        style={{ borderRadius: 10, fontWeight: 600 }}
        status={vacancy.title.trim() ? undefined : 'error'}
      />

      <div>
        <label style={{ display: 'block', fontSize: 12, color: palette.textSecondary, marginBottom: 6 }}>
          Описание
        </label>
        <Input.TextArea
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            updateField({ description: event.target.value });
          }}
          autoSize={{ minRows: 3, maxRows: 8 }}
          placeholder="Чем будет заниматься человек"
          style={{ borderRadius: 10 }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, color: palette.textSecondary, marginBottom: 6 }}>
          Требования
        </label>
        <Input.TextArea
          value={requirements}
          onChange={(event) => {
            setRequirements(event.target.value);
            updateField({ requirements: event.target.value });
          }}
          autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder="Ключевые требования и стек"
          style={{ borderRadius: 10 }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, color: palette.textSecondary, marginBottom: 6 }}>
          Вознаграждение
        </label>
        <Input
          value={reward}
          onChange={(event) => {
            setReward(event.target.value);
            updateField({ reward: event.target.value });
          }}
          placeholder="Например: от 200 000 ₽, опционы"
          style={{ borderRadius: 10 }}
        />
      </div>
    </section>
  );
};
