from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.vacancies.models import VacancyTemplate

TEMPLATES: tuple[dict[str, str], ...] = (
    {
        "id": "frontend-developer",
        "title": "Frontend Developer",
        "description": "Развитие пользовательских интерфейсов продукта.",
        "requirements": "React, TypeScript, опыт от 2 лет.",
        "reward": "от 200 000 ₽, удалённый формат.",
    },
    {
        "id": "backend-developer",
        "title": "Backend Developer",
        "description": "Проектирование и развитие серверной части продукта.",
        "requirements": "Python, FastAPI, PostgreSQL, опыт от 2 лет.",
        "reward": "от 240 000 ₽, гибрид.",
    },
    {
        "id": "product-manager",
        "title": "Product Manager",
        "description": "Развитие продукта, гипотезы, приоритизация бэклога.",
        "requirements": "Опыт управления продуктом от 2 лет.",
        "reward": "от 230 000 ₽, опционы.",
    },
    {
        "id": "product-designer",
        "title": "Product Designer",
        "description": "Проектирование интерфейсов и дизайн-системы.",
        "requirements": "Портфолио B2B-продуктов, Figma.",
        "reward": "от 180 000 ₽, по ТК.",
    },
    {
        "id": "data-analyst",
        "title": "Data Analyst",
        "description": "Аналитика продуктовых метрик и подготовка решений.",
        "requirements": "SQL, Python, BI-инструменты.",
        "reward": "от 190 000 ₽, удалённо.",
    },
)


async def seed_vacancy_templates(session: AsyncSession) -> None:
    dialect = session.bind.dialect.name if session.bind else "postgresql"

    for template in TEMPLATES:
        if dialect == "postgresql":
            stmt = (
                pg_insert(VacancyTemplate)
                .values(**template, is_active=True)
                .on_conflict_do_nothing(index_elements=["id"])
            )
            await session.execute(stmt)
        else:
            exists = await session.scalar(select(VacancyTemplate.id).where(VacancyTemplate.id == template["id"]))
            if not exists:
                session.add(VacancyTemplate(**template, is_active=True))

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
