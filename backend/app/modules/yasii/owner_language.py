"""YASII Owner Language Layer — owner-facing responses; technical detail on request."""

from app.modules.yasii.developer_profile import YASII_OWNER_ROLES
from app.modules.yasii.developer_readiness import get_developer_readiness
from app.modules.yasii.impact_analysis import find_component_in_text

OWNER_LANGUAGE_SCHEMA_VERSION = "0.1.0"

_TECHNICAL_DETAIL_KEYWORDS = (
    "покажи технически",
    "технически",
    "подробности",
    "для разработчика",
    "архитектурно",
    "technical details",
)

_STATUS_KEYWORDS = (
    "что уже готово",
    "что работает",
    "что реализовано",
    "какие возможности уже есть",
    "что уже есть",
)

_LIMITATIONS_KEYWORDS = (
    "что пока не работает",
    "чего ещё нет",
    "чего еще нет",
    "что ещё предстоит",
    "что еще предстоит",
    "что ещё не готово",
    "что еще не готово",
)

_VALUE_KEYWORDS = (
    "чем ясии уже полезен",
    "чем полезен ясии",
    "что я могу проверить",
    "для чего мне ясии",
    "для чего нужен ясии",
    "зачем мне ясии",
)

_OWNER_READY_CAPABILITIES = [
    "Представляться и объяснять свою роль в системе",
    "Рассказывать об архитектуре платформы простым языком",
    "Показывать, на что повлияет изменение в системе",
    "Показывать цепочку зависимостей между частями платформы",
    "Объяснять, почему компоненты устроены именно так",
    "Отвечать на типовые вопросы о том, как устроена платформа",
    "Оценивать текущую готовность ЯСИИ как цифрового сотрудника",
]

_OWNER_MISSING_CAPABILITIES = [
    "Анализировать реальный код проекта",
    "Искать по всему репозиторию",
    "Автоматически вносить изменения в код",
    "Глубоко разбирать структуру исходников",
    "Генерировать готовые решения за разработчика",
    "Полностью заменять команду разработки",
]

_VERDICT_OWNER_EXPLANATIONS: dict[str, str] = {
    "Intent Resolver": (
        "Сначала ЯСИИ старается понять, что именно нужно пользователю.\n\n"
        "Это позволяет дальше подбирать релевантную информацию, "
        "а не отвечать вслепую."
    ),
    "Knowledge Resolver": (
        "После понимания запроса ЯСИИ подбирает нужные знания о платформе.\n\n"
        "Так ответы опираются на контекст, а не на общие догадки."
    ),
    "Graph Resolver": (
        "Когда выбраны знания, ЯСИИ смотрит, какие части системы связаны между собой.\n\n"
        "Это помогает не потерять важные зависимости."
    ),
    "Evidence Resolver": (
        "Сначала система собирает необходимые данные и подтверждения.\n\n"
        "Только после этого имеет смысл проверять их по правилам."
    ),
    "Rule Engine": (
        "Сначала система собирает необходимые данные.\n\n"
        "После этого ЯСИИ проверяет их по правилам.\n\n"
        "Это позволяет принимать решения на основе уже проверенной информации."
    ),
    "Verdict Engine": (
        "После проверки по правилам ЯСИИ формирует итоговое решение.\n\n"
        "Так пользователь получает согласованный вывод, а не набор разрозненных фактов."
    ),
    "Answer Builder": (
        "Итоговое решение сначала формируется внутри системы.\n\n"
        "И только потом ЯСИИ переводит его в понятный ответ для пользователя."
    ),
    "Runtime Orchestrator": (
        "ЯСИИ координирует весь путь запроса через платформу.\n\n"
        "Это похоже на диспетчера: он следит, чтобы каждый шаг выполнялся в нужном порядке."
    ),
}


def wants_technical_details(text: str) -> bool:
    normalized = str(text or "").strip().lower()
    return any(keyword in normalized for keyword in _TECHNICAL_DETAIL_KEYWORDS)


def _contains_any(normalized_text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized_text for keyword in keywords)


def _format_owner_response(
    *,
    headline: str,
    meaning: str,
    works: str,
    missing: str,
    next_step: str,
) -> str:
    return (
        f"{headline}\n\n"
        f"Что это означает:\n{meaning}\n\n"
        f"Что уже работает:\n{works}\n\n"
        f"Что пока отсутствует:\n{missing}\n\n"
        f"Что можно сделать дальше:\n{next_step}"
    )


def _bullet_block(items: list[str]) -> str:
    return "\n".join(f"• {item}" for item in items)


def resolve_owner_status_message(text: str) -> str | None:
    normalized = str(text or "").strip().lower()
    if not normalized or not _contains_any(normalized, _STATUS_KEYWORDS):
        return None

    readiness = get_developer_readiness()
    return _format_owner_response(
        headline="Краткий вывод: базовые возможности ЯСИИ для владельца продукта уже доступны.",
        meaning=(
            "ЯСИИ может помогать ориентироваться в платформе, объяснять архитектуру "
            "и отвечать на вопросы о текущем состоянии проекта."
        ),
        works=_bullet_block(_OWNER_READY_CAPABILITIES),
        missing=_bullet_block(_OWNER_MISSING_CAPABILITIES),
        next_step=(
            f"Можно задавать вопросы о готовности, пользе и ограничениях ЯСИИ. "
            f"Текущая оценка зрелости — {readiness.score}% (уровень {readiness.level.value}). "
            "Технические детали доступны по запросу «Покажи технически»."
        ),
    )


def resolve_owner_limitations_message(text: str) -> str | None:
    normalized = str(text or "").strip().lower()
    if not normalized or not _contains_any(normalized, _LIMITATIONS_KEYWORDS):
        return None

    return _format_owner_response(
        headline="Краткий вывод: часть возможностей ещё впереди.",
        meaning=(
            "ЯСИИ уже полезен как навигатор и объясняющий помощник, "
            "но пока не заменяет полноценную работу с кодом."
        ),
        works=_bullet_block(
            [
                "Объяснение архитектуры и связей в платформе",
                "Ответы о влиянии изменений и зависимостях",
                "Оценка готовности и зрелости на текущем этапе",
            ]
        ),
        missing=_bullet_block(_OWNER_MISSING_CAPABILITIES),
        next_step=(
            "Можно уточнить, что именно нужно проверить в проекте сейчас, "
            "или запросить технический разбор для команды разработки."
        ),
    )


def resolve_owner_value_message(text: str) -> str | None:
    normalized = str(text or "").strip().lower()
    if not normalized or not _contains_any(normalized, _VALUE_KEYWORDS):
        return None

    return (
        "Сейчас ЯСИИ может выступать навигатором по проекту.\n\n"
        "Он умеет объяснять архитектуру платформы, показывать связи между "
        "компонентами, объяснять последствия изменений и отвечать на вопросы "
        "о текущем состоянии проекта.\n\n"
        "ЯСИИ пока не умеет анализировать реальный код и автоматически вносить изменения.\n\n"
        "Что можно сделать дальше: задать вопрос о готовности системы, ограничениях "
        "или запросить технические подробности для команды разработки."
    )


def _transform_developer_profile(message: str) -> str:
    roles = ", ".join(YASII_OWNER_ROLES)
    return _format_owner_response(
        headline="Краткий вывод: я ЯСИИ — цифровой сотрудник для владельца продукта.",
        meaning=(
            f"Моя роль: {roles}. Я помогаю понимать платформу, её устройство "
            "и текущее состояние без необходимости читать техническую документацию."
        ),
        works=_bullet_block(_OWNER_READY_CAPABILITIES[:4]),
        missing=_bullet_block(_OWNER_MISSING_CAPABILITIES[:3]),
        next_step="Спросите, что уже готово, чем я полезен сейчас или что пока отсутствует.",
    )


def _transform_developer_readiness(message: str) -> str:
    readiness = get_developer_readiness()
    return _format_owner_response(
        headline=(
            f"Краткий вывод: ЯСИИ на этапе MVP, готовность около {readiness.score}%."
        ),
        meaning=(
            "ЯСИИ уже может помогать владельцу продукта ориентироваться в системе, "
            "но не выполняет полноценный анализ исходного кода."
        ),
        works=_bullet_block(_OWNER_READY_CAPABILITIES),
        missing=_bullet_block(_OWNER_MISSING_CAPABILITIES),
        next_step=(
            "Уточните, что хотите проверить в проекте, или запросите технический отчёт "
            "«Покажи технически»."
        ),
    )


def _component_from_knowledge_message(message: str) -> str | None:
    marker = "Компонент:\n"
    if marker in message:
        line = message.split(marker, 1)[1].strip().split("\n", 1)[0].strip()
        if line:
            return line
    return find_component_in_text(message)


def _transform_architecture_verdict(message: str) -> str:
    component = _component_from_knowledge_message(message)
    explanation = _VERDICT_OWNER_EXPLANATIONS.get(component or "")
    if not explanation:
        return message

    label = component or "компонент"
    return _format_owner_response(
        headline=f"Краткий вывод: так устроена часть платформы — {label}.",
        meaning=explanation,
        works="ЯСИИ может объяснить логику устройства без погружения в код.",
        missing="Пока нет автоматической проверки реального кода проекта.",
        next_step="Запросите «Покажи технически» или «Для разработчика», если нужен точный разбор.",
    )


def _transform_impact_analysis(message: str) -> str:
    component = find_component_in_text(message)
    return _format_owner_response(
        headline=f"Краткий вывод: изменение в области «{component or 'системы'}» затронет связанные части.",
        meaning=(
            "Если меняется эта часть платформы, следующие шаги обработки запроса "
            "тоже могут измениться. Это важно учитывать при планировании."
        ),
        works="ЯСИИ показывает, какие части системы связаны с выбранным компонентом.",
        missing="Пока нет автоматического анализа всего репозитория.",
        next_step="Уточните, что именно планируется менять, или запросите технический impact-отчёт.",
    )


def _transform_dependency_analysis(message: str) -> str:
    return _format_owner_response(
        headline="Краткий вывод: у платформы есть последовательность связанных шагов.",
        meaning=(
            "Запрос проходит через цепочку этапов — от понимания вопроса до финального ответа. "
            "Каждый шаг опирается на результат предыдущего."
        ),
        works="ЯСИИ может показать эту цепочку простым языком.",
        missing="ЯСИИ пока не строит карту зависимостей по реальному коду.",
        next_step="Спросите «Покажи зависимости …» для цепочки или «Покажи технически» для деталей.",
    )


def _transform_architecture_review(message: str) -> str:
    return _format_owner_response(
        headline="Краткий вывод: платформа развивается поэтапно, сейчас этап Developer MVP.",
        meaning=(
            "Уже заложены основы, runtime и набор объясняющих возможностей. "
            "Дальше — расширение для владельца продукта и интеграций."
        ),
        works="ЯСИИ может описать фазы, компоненты и текущий этап без технического жаргона.",
        missing="Нет полной картины по каждому модулю исходного кода.",
        next_step="Спросите «Какие фазы реализованы?» или «Покажи технически» для архитектурного обзора.",
    )


def _transform_developer_query(message: str) -> str:
    if "Запрос проходит через:" in message:
        return _transform_dependency_analysis(message)

    component = find_component_in_text(message)
    if component and "Назначение:" in message:
        verdict_style = _VERDICT_OWNER_EXPLANATIONS.get(component)
        if verdict_style:
            return _format_owner_response(
                headline=f"Краткий вывод: {component} помогает обрабатывать запросы в платформе.",
                meaning=verdict_style,
                works="ЯСИИ объясняет назначение части системы простыми словами.",
                missing="Нет анализа вашего конкретного кода.",
                next_step="Запросите технические подробности при необходимости.",
            )

    if "Компоненты ЯСИИ" in message:
        return resolve_owner_status_message("что реализовано") or message

    return _format_owner_response(
        headline="Краткий вывод: ЯСИИ ответил на вопрос о платформе.",
        meaning=message.split("Назначение:")[-1].strip() if "Назначение:" in message else message,
        works="Доступны ответы о структуре и логике платформы.",
        missing="Нет работы с исходным кодом проекта.",
        next_step="Уточните вопрос или запросите технический формат ответа.",
    )


def apply_owner_language(message: str, question: str) -> str:
    """Wrap a knowledge response in owner language unless technical detail was requested."""
    if not message or wants_technical_details(question):
        return message

    if message.startswith("Owner Assistant Profile"):
        return message

    if message.startswith("Platform Health Snapshot"):
        return message

    if message.startswith("Reality Check"):
        return message

    if message.startswith("Deviation Registry"):
        return message

    if message.startswith("Owner Report"):
        return message

    if message.startswith("Improvement Suggestions"):
        return message

    if message.startswith("Owner Readiness"):
        return message

    if message.startswith("Developer Readiness"):
        return _transform_developer_readiness(message)

    if message.startswith("Developer Query"):
        return _transform_developer_query(message)

    if message.startswith("Architecture Verdict"):
        return _transform_architecture_verdict(message)

    if message.startswith("Impact Analysis"):
        return _transform_impact_analysis(message)

    if message.startswith("Dependency Analysis"):
        return _transform_dependency_analysis(message)

    if "Архитектурный обзор" in message or message.startswith("Фазы реализации"):
        return _transform_architecture_review(message)

    if message.startswith("Я ") and "ЯСИИ" in message[:20]:
        return _transform_developer_profile(message)

    if "Возможности ЯСИИ" in message or "Ограничения ЯСИИ" in message:
        return _transform_developer_profile(message)

    if message == "YASII runtime pipeline is available":
        return _format_owner_response(
            headline="Краткий вывод: технический контур ЯСИИ доступен.",
            meaning="Система может обработать запрос и вернуть ответ по заданному сценарию.",
            works="Базовый runtime pipeline работает.",
            missing="Расширенные owner-функции (риски, статус проекта) — в следующих фазах.",
            next_step="Спросите «Что уже готово?» или «Чем ЯСИИ полезен?»",
        )

    return message


def resolve_owner_language_message(text: str) -> str | None:
    """Owner-first questions that do not require the technical resolver chain."""
    return (
        resolve_owner_status_message(text)
        or resolve_owner_limitations_message(text)
        or resolve_owner_value_message(text)
    )
