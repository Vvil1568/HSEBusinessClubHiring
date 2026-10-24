class DomainException(Exception):
    """Base class for framework-agnostic business errors."""

    status_code: int = 400
    default_message: str = "Запрос не может быть обработан"

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.default_message
        super().__init__(self.message)


class AuthRequiredException(DomainException):
    status_code = 401
    default_message = "Требуется авторизация"


class InvalidTelegramDataException(AuthRequiredException):
    default_message = "Не удалось проверить данные Telegram"


class UserBlockedException(DomainException):
    status_code = 403
    default_message = "Доступ к приложению закрыт"


class PermissionDeniedException(DomainException):
    status_code = 403
    default_message = "Недостаточно прав"


class EntityNotFoundException(DomainException):
    status_code = 404
    default_message = "Ресурс не найден"


class EntityConflictException(DomainException):
    status_code = 409
    default_message = "Конфликт состояния"


class UnprocessableEntityException(DomainException):
    status_code = 422
    default_message = "Нарушены бизнес-правила"


class InsufficientStorageException(DomainException):
    status_code = 507
    default_message = "Хранилище файлов переполнено"


class RateLimitExceededException(DomainException):
    status_code = 429
    default_message = "Слишком много запросов, попробуйте позже"

    def __init__(self, message: str | None = None, retry_after: int = 30) -> None:
        self.retry_after = retry_after
        super().__init__(message)
