import { FilterOutlined } from '@ant-design/icons';
import { Badge, Button } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useDebounce } from '../hooks/useDebounce';
import { useVacancyList, useVacancyTitles } from '../features/vacancies/api/useVacancies';
import { VacancyFilterDrawer } from '../features/vacancies/components/VacancyFilterDrawer';
import { VacancyCard } from '../components/ui/VacancyCard';
import { SearchBar } from '../components/ui/SearchBar';
import { PaginationBar } from '../components/ui/PaginationBar';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { ListSkeleton } from '../components/common/Skeletons';
import { PageHeader } from '../components/layout/PageHeader';
import type { VacancySort } from '../types';

const PAGE_SIZE = 8;

export const VacanciesPage = () => {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<VacancySort>('new');
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 350);
  const { data: titles } = useVacancyTitles();
  const { data, isLoading, isError, error, refetch } = useVacancyList({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch.trim(),
    sortBy,
    titles: selectedTitles,
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleToggleTitle = (title: string) => {
    setSelectedTitles((current) =>
      current.includes(title) ? current.filter((item) => item !== title) : [...current, title],
    );
    setPage(1);
  };

  const handleResetTitles = () => {
    setSelectedTitles([]);
    setPage(1);
  };

  const handleSortChange = (value: VacancySort) => {
    setSortBy(value);
    setPage(1);
  };

  const handleOpen = (id: string) => navigate(`/vacancy/${id}`);
  const filterCount = selectedTitles.length + (sortBy !== 'new' ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Вакансии"
        subtitle="Открытые роли в стартапах участников клуба"
        extra={
          <Badge count={filterCount} size="small" offset={[-4, 4]}>
            <Button icon={<FilterOutlined />} onClick={() => setFilterOpen(true)}>
              Фильтр
            </Button>
          </Badge>
        }
      />

      <div style={{ marginBottom: 20, maxWidth: 560 }}>
        <SearchBar
          value={search}
          onChange={handleSearchChange}
          placeholder="Поиск по стартапу, требованиям и вознаграждению"
          ariaLabel="Поиск вакансий"
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
        <ListSkeleton count={5} />
      ) : data && data.items.length > 0 ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {data.items.map((vacancy) => (
              <VacancyCard key={vacancy.id} vacancy={vacancy} onOpen={handleOpen} />
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
          title="Вакансии не найдены"
          description="Измените ключевые слова или сбросьте фильтры, чтобы увидеть больше ролей."
          actionLabel="Сбросить фильтры"
          onAction={() => {
            handleSearchChange('');
            handleResetTitles();
            handleSortChange('new');
          }}
        />
      )}

      <VacancyFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        titles={titles ?? []}
        selectedTitles={selectedTitles}
        onToggleTitle={handleToggleTitle}
        onResetTitles={handleResetTitles}
        sortBy={sortBy}
        onSortChange={handleSortChange}
      />
    </div>
  );
};
