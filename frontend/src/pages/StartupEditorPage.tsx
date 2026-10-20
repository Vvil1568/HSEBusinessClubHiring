import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { Alert, App, Button, Input, Segmented } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useDraftState } from '../hooks/useDraftState';
import { clearDraft } from '../utils/drafts';
import { useSaveStartup, useStartupDetail } from '../features/startups/api/useStartups';
import { useVacancyTemplates } from '../features/vacancies/api/useVacancies';
import { LogoUploader } from '../features/startups/components/LogoUploader';
import { TemplatePicker } from '../features/startups/components/TemplatePicker';
import { VacancyEditorCard } from '../features/startups/components/VacancyEditorCard';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { PageHeader } from '../components/layout/PageHeader';
import { palette, stageLabels } from '../theme/tokens';
import type { Startup, StartupInput, StartupStage, VacancyInput } from '../types';

const stageOptions: Array<{ value: StartupStage; label: string }> = [
  { value: 'idea', label: stageLabels.idea },
  { value: 'mvp', label: stageLabels.mvp },
  { value: 'scaling', label: stageLabels.scaling },
];

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 8,
  color: palette.textSecondary,
} as const;

interface EditorVacancy extends VacancyInput {
  editorKey: string;
}

const mapVacancies = (startup: Startup | undefined): EditorVacancy[] =>
  (startup?.vacancies ?? []).map((vacancy) => ({
    id: vacancy.id,
    editorKey: vacancy.id,
    title: vacancy.title,
    description: vacancy.description,
    requirements: vacancy.requirements,
    reward: vacancy.reward,
    isHidden: vacancy.isHidden,
  }));

interface StartupFormProps {
  mode: 'create' | 'edit';
  startup?: Startup;
  draftKey: string;
}

const StartupForm = ({ mode, startup, draftKey }: StartupFormProps) => {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { message } = App.useApp();
  const { data: templates, isLoading: templatesLoading } = useVacancyTemplates();
  const saveMutation = useSaveStartup();

  const [title, setTitle] = useState(startup?.title ?? '');
  const [logoUrl, setLogoUrl] = useState<string | null>(startup?.logoUrl ?? null);
  const [stage, setStage] = useState<StartupStage>(startup?.stage ?? 'idea');
  const [shortDescription, setShortDescription] = useDraftState(
    `${draftKey}:short`,
    startup?.shortDescription ?? '',
  );
  const [description, setDescription] = useDraftState(
    `${draftKey}:long`,
    startup?.description ?? '',
  );
  const [vacancies, setVacancies] = useState<EditorVacancy[]>(mapVacancies(startup));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isValid = useMemo(
    () =>
      title.trim().length > 1 &&
      shortDescription.trim().length > 10 &&
      description.trim().length > 20,
    [title, shortDescription, description],
  );

  const addVacancy = (vacancy: VacancyInput) => {
    setVacancies((current) => [
      ...current,
      {
        ...vacancy,
        editorKey: `new-${Date.now()}-${current.length}-${Math.random().toString(36).slice(2, 7)}`,
      },
    ]);
  };

  const updateVacancy = (index: number, vacancy: EditorVacancy) => {
    setVacancies((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? vacancy : item)),
    );
  };

  const removeVacancy = (index: number) => {
    setVacancies((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSave = () => {
    if (!isValid) {
      setValidationError('Заполните название, краткое и подробное описание.');
      return;
    }
    if (vacancies.some((vacancy) => !vacancy.title.trim())) {
      setValidationError('У каждой вакансии должно быть название.');
      return;
    }

    setValidationError(null);
    const payload: StartupInput = {
      title: title.trim(),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      logoUrl,
      stage,
      vacancies: vacancies.map((item) => ({
        id: item.id,
        title: item.title.trim(),
        description: item.description.trim(),
        requirements: item.requirements.trim(),
        reward: item.reward.trim(),
        isHidden: item.isHidden,
      })),
    };

    saveMutation.mutate(
      { id: mode === 'edit' ? startup?.id : undefined, payload },
      {
        onSuccess: (savedStartup) => {
          clearDraft(`${draftKey}:short`);
          clearDraft(`${draftKey}:long`);
          message.success(mode === 'edit' ? 'Стартап обновлён' : 'Стартап создан');
          navigate(`/startup/${savedStartup.id}`);
        },
        onError: (saveError) => {
          message.error(extractErrorMessage(saveError));
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        title={mode === 'edit' ? 'Редактирование стартапа' : 'Новый стартап'}
        subtitle="Заполните описание проекта и добавьте открытые роли"
        showBack
        backFallback={mode === 'edit' && startup ? `/startup/${startup.id}` : '/startup'}
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            onClick={handleSave}
          >
            {mode === 'edit' ? 'Сохранить' : 'Создать стартап'}
          </Button>
        }
      />

      {validationError ? (
        <Alert
          type="warning"
          showIcon
          message={validationError}
          style={{ marginBottom: 16, borderRadius: 12 }}
        />
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: 20,
            borderRadius: 16,
            border: `1px solid ${palette.border}`,
            background: palette.surface,
          }}
        >
          <LogoUploader value={logoUrl} onChange={setLogoUrl} />

          <div>
            <label htmlFor="startup-title" style={labelStyle}>
              Название
            </label>
            <Input
              id="startup-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Как называется проект"
              size="large"
              style={{ borderRadius: 12 }}
            />
          </div>

          <div>
            <label htmlFor="startup-short" style={labelStyle}>
              Краткое описание
            </label>
            <Input.TextArea
              id="startup-short"
              value={shortDescription}
              onChange={(event) => setShortDescription(event.target.value)}
              placeholder="Одно-два предложения о сути проекта"
              autoSize={{ minRows: 2, maxRows: 4 }}
              showCount
              maxLength={200}
              style={{ borderRadius: 12 }}
            />
          </div>

          <div>
            <label htmlFor="startup-long" style={labelStyle}>
              Подробное описание
            </label>
            <Input.TextArea
              id="startup-long"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Проблема, решение, стадия, команда и планы"
              autoSize={{ minRows: 6, maxRows: 14 }}
              style={{ borderRadius: 12 }}
            />
          </div>

          <div>
            <span style={labelStyle}>Этап</span>
            <Segmented<StartupStage>
              block={isMobile}
              value={stage}
              onChange={(value) => setStage(value)}
              options={stageOptions}
            />
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Вакансии</h2>
            <Button icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
              Добавить вакансию
            </Button>
          </div>

          {vacancies.length === 0 ? (
            <EmptyState
              title="Вакансий пока нет"
              description="Добавьте вакансию из шаблона или создайте новую с нуля."
              actionLabel="Добавить вакансию"
              onAction={() => setPickerOpen(true)}
            />
          ) : (
            vacancies.map((vacancy, index) => (
              <VacancyEditorCard
                key={vacancy.id ?? `new-${index}`}
                vacancy={vacancy}
                index={index}
                draftKey={`${draftKey}:vacancy:${vacancy.editorKey}`}
                onChange={(next) =>
                  updateVacancy(index, { ...next, editorKey: vacancy.editorKey })
                }
                onRemove={() => removeVacancy(index)}
                onOpenStats={
                  vacancy.id ? () => navigate(`/vacancy/${vacancy.id}/stats`) : undefined
                }
              />
            ))
          )}
        </section>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button
            onClick={() => navigate(mode === 'edit' && startup ? `/startup/${startup.id}` : '/startup')}
            disabled={saveMutation.isPending}
          >
            Отмена
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            onClick={handleSave}
          >
            {mode === 'edit' ? 'Сохранить изменения' : 'Создать стартап'}
          </Button>
        </div>
      </div>

      <TemplatePicker
        open={pickerOpen}
        templates={templates ?? []}
        loading={templatesLoading}
        onClose={() => setPickerOpen(false)}
        onSelectTemplate={(template) =>
          addVacancy({
            title: template.title,
            description: template.description,
            requirements: template.requirements,
            reward: template.reward,
            isHidden: false,
          })
        }
        onCreateBlank={() =>
          addVacancy({
            title: '',
            description: '',
            requirements: '',
            reward: '',
            isHidden: false,
          })
        }
      />
    </div>
  );
};

interface StartupEditorPageProps {
  mode: 'create' | 'edit';
}

export const StartupEditorPage = ({ mode }: StartupEditorPageProps) => {
  const { id } = useParams<{ id: string }>();
  const { data: existing, isLoading, isError, error, refetch } = useStartupDetail(
    mode === 'edit' ? id : undefined,
  );

  if (mode === 'create') {
    return <StartupForm mode="create" draftKey="startup:new" />;
  }

  if (isLoading) {
    return <EmptyState title="Загружаем стартап" description="Это займёт несколько секунд." />;
  }

  if (isError || !existing) {
    return (
      <ErrorState
        message={extractErrorMessage(error)}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return <StartupForm mode="edit" startup={existing} draftKey={`startup:${existing.id}`} />;
};
