import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor


def handler(event: dict, context) -> dict:
    '''
    Business: API для учёта оборудования и его ремонтов (список, поиск, добавление, история, статистика).
    Args: event - dict с httpMethod, queryStringParameters, body; context - объект с request_id.
    Returns: HTTP-ответ с JSON данными об оборудовании и ремонтах.
    '''
    method = event.get('httpMethod', 'GET')

    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True

    try:
        params = event.get('queryStringParameters') or {}
        resource = params.get('resource', 'equipment')

        if method == 'GET' and resource == 'stats':
            return _get_stats(conn, cors_headers)
        if method == 'GET':
            return _list_equipment(conn, cors_headers)
        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            action = body.get('action')
            if action == 'add_repair':
                return _add_repair(conn, body, cors_headers)
            return _add_equipment(conn, body, cors_headers)

        return {'statusCode': 405, 'headers': cors_headers, 'body': json.dumps({'error': 'Method not allowed'})}
    finally:
        conn.close()


def _list_equipment(conn, headers):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id, inv_number, name, category, location, status, "
            "to_char(installed, 'YYYY-MM-DD') AS installed FROM equipment ORDER BY id"
        )
        items = cur.fetchall()

        cur.execute(
            "SELECT id, equipment_id, to_char(repair_date, 'YYYY-MM-DD') AS repair_date, "
            "repair_type, description, master, status FROM repairs ORDER BY repair_date DESC, id DESC"
        )
        repairs = cur.fetchall()

    by_eq = {}
    for r in repairs:
        by_eq.setdefault(r['equipment_id'], []).append(r)
    for it in items:
        it['repairs'] = by_eq.get(it['id'], [])

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'equipment': items}, ensure_ascii=False)}


def _get_stats(conn, headers):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT COUNT(*) AS total FROM equipment")
        total = cur.fetchone()['total']
        cur.execute("SELECT COUNT(*) AS c FROM equipment WHERE status = 'В ремонте'")
        in_repair = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) AS c FROM repairs WHERE status = 'Выполнен'")
        done = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) AS c FROM repairs WHERE status = 'Плановый'")
        planned = cur.fetchone()['c']
        cur.execute(
            "SELECT category, COUNT(*) AS c FROM equipment GROUP BY category ORDER BY c DESC"
        )
        by_category = cur.fetchall()
        cur.execute(
            "SELECT master, COUNT(*) AS c FROM repairs WHERE status = 'Выполнен' AND master <> '—' "
            "GROUP BY master ORDER BY c DESC"
        )
        by_master = cur.fetchall()

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'total': total,
            'in_repair': in_repair,
            'done': done,
            'planned': planned,
            'by_category': by_category,
            'by_master': by_master,
        }, ensure_ascii=False),
    }


def _add_equipment(conn, body, headers):
    inv = (body.get('inv_number') or '').strip()
    name = (body.get('name') or '').strip()
    if not inv or not name:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'inv_number и name обязательны'}, ensure_ascii=False)}

    category = (body.get('category') or '').strip()
    location = (body.get('location') or '').strip()
    status = (body.get('status') or 'Исправно').strip()
    installed = (body.get('installed') or '').strip()

    inv_e = inv.replace("'", "''")
    name_e = name.replace("'", "''")
    cat_e = category.replace("'", "''")
    loc_e = location.replace("'", "''")
    st_e = status.replace("'", "''")
    inst_sql = f"'{installed}'::date" if installed else "NULL"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id FROM equipment WHERE inv_number = '%s'" % inv_e)
        if cur.fetchone():
            return {'statusCode': 409, 'headers': headers, 'body': json.dumps({'error': 'Инвентарный номер уже существует'}, ensure_ascii=False)}
        cur.execute(
            "INSERT INTO equipment (inv_number, name, category, location, status, installed) "
            f"VALUES ('{inv_e}', '{name_e}', '{cat_e}', '{loc_e}', '{st_e}', {inst_sql}) RETURNING id"
        )
        new_id = cur.fetchone()['id']

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'id': new_id, 'ok': True}, ensure_ascii=False)}


def _add_repair(conn, body, headers):
    eq_id = body.get('equipment_id')
    date = (body.get('repair_date') or '').strip()
    if not eq_id or not date:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'equipment_id и repair_date обязательны'}, ensure_ascii=False)}

    rtype = (body.get('repair_type') or 'Ремонт').strip()
    desc = (body.get('description') or '').strip()
    master = (body.get('master') or '—').strip()
    status = (body.get('status') or 'Выполнен').strip()

    rtype_e = rtype.replace("'", "''")
    desc_e = desc.replace("'", "''")
    master_e = master.replace("'", "''")
    st_e = status.replace("'", "''")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "INSERT INTO repairs (equipment_id, repair_date, repair_type, description, master, status) "
            f"VALUES ({int(eq_id)}, '{date}'::date, '{rtype_e}', '{desc_e}', '{master_e}', '{st_e}') RETURNING id"
        )
        new_id = cur.fetchone()['id']
        new_eq_status = 'В ремонте' if status == 'Плановый' else 'Исправно'
        cur.execute(
            f"UPDATE equipment SET status = '{new_eq_status}' WHERE id = {int(eq_id)}"
        )

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'id': new_id, 'ok': True}, ensure_ascii=False)}
