import { PlusOutlined } from '@ant-design/icons';
import { Button, FloatButton } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useDebounce } from '../hooks/useDebounce';
import { useStartupList } from '../features/startups/api/useStartups';
import { StartupCard } from '../components/ui/StartupCard';
import { SearchBar } from '../components/ui/SearchBar';
import { PaginationBar } from '../components/ui/PaginationBar';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { StartupsGridSkeleton } from '../components/common/Skeletons';
import { PageHeader } from '../components/layout/PageHeader';
import { palette } from '../theme/tokens';

const PAGE_SIZE = 6;

export const StartupsPage = () => {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, error, refetch } = useStartupList({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch.trim(),
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleOpen = (id: string) => navigate(`/startup/${id}`);
  const goCreate = () => navigate('/startups/new');

  return (
    <div>
      <PageHeader
        title="Стартапы"
        subtitle="Проекты участников клуба: изучайте команды и присоединяйтесь"
        extra={
          !isMobile ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={goCreate}>
              Создать стартап
            </Button>
          ) : null
        }
      />

      <div style={{ marginBottom: 20, maxWidth: 560 }}>
        <SearchBar
          value={search}
          onChange={handleSearchChange}
          placeholder="Поиск по названию и описанию"
          ariaLabel="Поиск стартапов"
        />
      </div>

      {isError ? (
        <ErrorState
          message={extractErrorMessage(error)}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : isLoading ? (
        <StartupsGridSkeleton count={PAGE_SIZE} />
      ) : data && data.items.length > 0 ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
              gap: 16,
            }}
          >
            {data.items.map((startup) => (
              <StartupCard key={startup.id} startup={startup} onOpen={handleOpen} />
            ))}
          </div>
          <PaginationBar
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          title="Стартапы не найдены"
          description={
            search
              ? 'Попробуйте изменить ключевые слова или сбросить поиск.'
              : 'В клубе пока нет стартапов. Создайте первый проект.'
          }
          actionLabel={search ? 'Сбросить поиск' : 'Создать стартап'}
          onAction={search ? () => handleSearchChange('') : goCreate}
        />
      )}

      <FloatButton
        type="primary"
        icon={<PlusOutlined />}
        tooltip="Создать стартап"
        onClick={goCreate}
        style={{
          insetInlineEnd: 24,
          insetBlockEnd: 24,
          width: 56,
          height: 56,
          background: palette.primary,
        }}
      />
    </div>
  );
};
