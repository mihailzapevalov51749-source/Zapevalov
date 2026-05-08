def create_table(db: Session, payload):
    # 1. Проверяем — есть ли уже таблица для блока
    if payload.block_id:
        existing_table = (
            db.query(UniversalTable)
            .filter(UniversalTable.block_id == payload.block_id)
            .first()
        )

        if existing_table:
            return existing_table  # ← КЛЮЧЕВОЕ

    # 2. Создаём новую
    table = UniversalTable(
        block_id=payload.block_id,
        title=payload.title or "Таблица",
        settings=payload.settings or {},
    )

    db.add(table)
    db.commit()
    db.refresh(table)

    return table