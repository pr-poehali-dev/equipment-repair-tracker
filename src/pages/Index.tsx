import { useState, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Status = 'Исправно' | 'В ремонте' | 'План ТО';

interface Repair {
  date: string;
  type: string;
  desc: string;
  master: string;
  status: 'Выполнен' | 'Плановый';
}

interface Equipment {
  inv: string;
  name: string;
  category: string;
  location: string;
  status: Status;
  installed: string;
  repairs: Repair[];
}

const DATA: Equipment[] = [
  {
    inv: 'INV-100482',
    name: 'Токарный станок ТВ-16',
    category: 'Станки',
    location: 'Цех №1, участок А',
    status: 'Исправно',
    installed: '2019-03-14',
    repairs: [
      { date: '2025-11-20', type: 'ТО', desc: 'Замена смазки, проверка узлов', master: 'Кузнецов А.В.', status: 'Выполнен' },
      { date: '2026-07-01', type: 'ТО', desc: 'Плановое квартальное обслуживание', master: '—', status: 'Плановый' },
    ],
  },
  {
    inv: 'INV-100517',
    name: 'Компрессор ВК-25',
    category: 'Пневматика',
    location: 'Компрессорная',
    status: 'В ремонте',
    installed: '2021-06-02',
    repairs: [
      { date: '2026-06-15', type: 'Ремонт', desc: 'Замена клапанной группы', master: 'Орлов Д.С.', status: 'Выполнен' },
      { date: '2026-05-30', type: 'Диагностика', desc: 'Падение давления на выходе', master: 'Орлов Д.С.', status: 'Выполнен' },
    ],
  },
  {
    inv: 'INV-100623',
    name: 'Сварочный аппарат ESAB',
    category: 'Сварка',
    location: 'Цех №2, пост 4',
    status: 'План ТО',
    installed: '2020-09-21',
    repairs: [
      { date: '2026-06-25', type: 'ТО', desc: 'Калибровка тока, чистка', master: '—', status: 'Плановый' },
    ],
  },
  {
    inv: 'INV-100744',
    name: 'Кран-балка 5т',
    category: 'Подъёмное',
    location: 'Цех №1, пролёт Б',
    status: 'Исправно',
    installed: '2018-01-10',
    repairs: [
      { date: '2025-10-05', type: 'Ремонт', desc: 'Замена тормозных колодок', master: 'Кузнецов А.В.', status: 'Выполнен' },
    ],
  },
  {
    inv: 'INV-100890',
    name: 'Фрезерный станок 6Р12',
    category: 'Станки',
    location: 'Цех №2, участок В',
    status: 'Исправно',
    installed: '2022-11-30',
    repairs: [
      { date: '2026-04-12', type: 'ТО', desc: 'Регулировка шпинделя', master: 'Орлов Д.С.', status: 'Выполнен' },
    ],
  },
];

const statusStyles: Record<Status, string> = {
  'Исправно': 'bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]',
  'В ремонте': 'bg-destructive/12 text-destructive',
  'План ТО': 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]',
};

function Index() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DATA;
    return DATA.filter(
      (e) =>
        e.inv.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q),
    );
  }, [query]);

  const totalRepairs = DATA.reduce((s, e) => s + e.repairs.filter((r) => r.status === 'Выполнен').length, 0);
  const planned = DATA.reduce((s, e) => s + e.repairs.filter((r) => r.status === 'Плановый').length, 0);
  const inRepair = DATA.filter((e) => e.status === 'В ремонте').length;

  const selected = DATA.find((e) => e.inv === active) ?? null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-6xl flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <Icon name="Wrench" size={18} className="text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold leading-tight tracking-tight">РемУчёт</div>
              <div className="font-mono text-[11px] text-muted-foreground leading-tight">учёт ремонта оборудования</div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Icon name="FileText" size={15} />
            Отчёт
          </Button>
        </div>
      </header>

      {/* Hero + Search */}
      <section className="grid-bg border-b border-border">
        <div className="container max-w-6xl py-12 animate-fade-in">
          <div className="font-mono text-xs text-accent mb-3 tracking-wider uppercase">Поиск по инвентарному номеру</div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight max-w-2xl leading-tight">
            Найдите оборудование и всю историю его ремонтов за секунды
          </h1>

          <div className="mt-8 relative max-w-2xl">
            <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="INV-100482, название, цех или категория…"
              className="h-14 pl-12 pr-4 text-base font-mono bg-card shadow-sm"
            />
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
            {[
              { label: 'Единиц оборудования', value: DATA.length, icon: 'Boxes' },
              { label: 'Ремонтов выполнено', value: totalRepairs, icon: 'CheckCircle2' },
              { label: 'Плановых работ', value: planned, icon: 'CalendarClock' },
              { label: 'В ремонте сейчас', value: inRepair, icon: 'TriangleAlert' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-card p-4">
                <Icon name={s.icon} size={18} className="text-accent mb-3" />
                <div className="font-mono text-2xl font-semibold tracking-tight">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipment list */}
      <section className="container max-w-6xl py-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold tracking-tight">Каталог оборудования</h2>
          <div className="font-mono text-xs text-muted-foreground">{filtered.length} из {DATA.length}</div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-secondary/60 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3 font-mono">Инв. номер</div>
            <div className="col-span-4">Наименование</div>
            <div className="col-span-3">Расположение</div>
            <div className="col-span-2 text-right">Статус</div>
          </div>

          {filtered.length === 0 && (
            <div className="px-5 py-16 text-center text-muted-foreground">
              <Icon name="SearchX" size={32} className="mx-auto mb-3 opacity-40" />
              Ничего не найдено по запросу «{query}»
            </div>
          )}

          {filtered.map((e, i) => (
            <button
              key={e.inv}
              onClick={() => setActive(e.inv)}
              className="w-full text-left grid grid-cols-2 md:grid-cols-12 gap-x-4 gap-y-1 px-5 py-4 border-b border-border last:border-0 hover:bg-secondary/40 transition-colors animate-fade-in"
              style={{ animationDelay: `${i * 40}ms`, opacity: 0 }}
            >
              <div className="md:col-span-3 font-mono text-sm font-medium text-accent">{e.inv}</div>
              <div className="md:col-span-4 col-span-2">
                <div className="font-medium leading-tight">{e.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{e.category}</div>
              </div>
              <div className="md:col-span-3 text-sm text-muted-foreground self-center">{e.location}</div>
              <div className="md:col-span-2 flex md:justify-end items-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[e.status]}`}>
                  {e.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Detail dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="font-mono text-sm text-accent">{selected.inv}</div>
                <DialogTitle className="text-2xl tracking-tight">{selected.name}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { label: 'Категория', value: selected.category, icon: 'Tag' },
                  { label: 'Расположение', value: selected.location, icon: 'MapPin' },
                  { label: 'Введён в строй', value: selected.installed, icon: 'Calendar' },
                  { label: 'Текущий статус', value: selected.status, icon: 'Activity' },
                ].map((f) => (
                  <div key={f.label} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Icon name={f.icon} size={13} /> {f.label}
                    </div>
                    <div className="text-sm font-medium">{f.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="History" size={16} className="text-accent" />
                  <h3 className="font-semibold">История ремонтов</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selected.repairs.map((r, idx) => (
                    <div key={idx} className="flex gap-3 rounded-lg border border-border p-3">
                      <div className="mt-0.5">
                        <div className={`w-2 h-2 rounded-full ${r.status === 'Выполнен' ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--warning))]'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{r.type} — {r.desc}</span>
                          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{r.date}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {r.status} · Мастер: {r.master}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button className="flex-1 gap-2">
                  <Icon name="Plus" size={15} /> Добавить ремонт
                </Button>
                <Button variant="outline" className="gap-2">
                  <Icon name="Printer" size={15} /> Печать карточки
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <footer className="border-t border-border mt-6">
        <div className="container max-w-6xl py-6 flex items-center justify-between">
          <div className="font-mono text-xs text-muted-foreground">РемУчёт · v0.1</div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <Icon name="Plus" size={15} /> Добавить оборудование
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новое оборудование</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Input placeholder="Инвентарный номер (INV-…)" className="font-mono" />
                <Input placeholder="Наименование" />
                <Input placeholder="Категория" />
                <Input placeholder="Расположение" />
                <Button className="w-full">Сохранить</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </footer>
    </div>
  );
}

export default Index;
