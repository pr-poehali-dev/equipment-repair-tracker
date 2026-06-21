CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    inv_number VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL DEFAULT '',
    location VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'Исправно',
    installed DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repairs (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    repair_date DATE NOT NULL,
    repair_type VARCHAR(64) NOT NULL DEFAULT 'Ремонт',
    description TEXT NOT NULL DEFAULT '',
    master VARCHAR(128) NOT NULL DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'Выполнен',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repairs_equipment ON repairs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_inv ON equipment(inv_number);

INSERT INTO equipment (inv_number, name, category, location, status, installed) VALUES
('INV-100482', 'Токарный станок ТВ-16', 'Станки', 'Цех №1, участок А', 'Исправно', '2019-03-14'::date),
('INV-100517', 'Компрессор ВК-25', 'Пневматика', 'Компрессорная', 'В ремонте', '2021-06-02'::date),
('INV-100623', 'Сварочный аппарат ESAB', 'Сварка', 'Цех №2, пост 4', 'План ТО', '2020-09-21'::date),
('INV-100744', 'Кран-балка 5т', 'Подъёмное', 'Цех №1, пролёт Б', 'Исправно', '2018-01-10'::date),
('INV-100890', 'Фрезерный станок 6Р12', 'Станки', 'Цех №2, участок В', 'Исправно', '2022-11-30'::date)
ON CONFLICT (inv_number) DO NOTHING;

INSERT INTO repairs (equipment_id, repair_date, repair_type, description, master, status)
SELECT id, '2025-11-20'::date, 'ТО', 'Замена смазки, проверка узлов', 'Кузнецов А.В.', 'Выполнен' FROM equipment WHERE inv_number='INV-100482'
UNION ALL
SELECT id, '2026-07-01'::date, 'ТО', 'Плановое квартальное обслуживание', '—', 'Плановый' FROM equipment WHERE inv_number='INV-100482'
UNION ALL
SELECT id, '2026-06-15'::date, 'Ремонт', 'Замена клапанной группы', 'Орлов Д.С.', 'Выполнен' FROM equipment WHERE inv_number='INV-100517'
UNION ALL
SELECT id, '2026-05-30'::date, 'Диагностика', 'Падение давления на выходе', 'Орлов Д.С.', 'Выполнен' FROM equipment WHERE inv_number='INV-100517'
UNION ALL
SELECT id, '2026-06-25'::date, 'ТО', 'Калибровка тока, чистка', '—', 'Плановый' FROM equipment WHERE inv_number='INV-100623'
UNION ALL
SELECT id, '2025-10-05'::date, 'Ремонт', 'Замена тормозных колодок', 'Кузнецов А.В.', 'Выполнен' FROM equipment WHERE inv_number='INV-100744'
UNION ALL
SELECT id, '2026-04-12'::date, 'ТО', 'Регулировка шпинделя', 'Орлов Д.С.', 'Выполнен' FROM equipment WHERE inv_number='INV-100890';