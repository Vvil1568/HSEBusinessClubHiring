import { Alert, Button } from 'antd';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => (
  <Alert
    type="error"
    showIcon
    message="Не удалось загрузить данные"
    description={message}
    style={{ borderRadius: 14 }}
    action={
      <Button size="small" danger onClick={onRetry}>
        Повторить
      </Button>
    }
  />
);
