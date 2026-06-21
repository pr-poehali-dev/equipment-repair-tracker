import { useState, useMemo, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const API = 'https://functions.poehali.dev/835f1874-99aa-418e-9a82-5e2e162670e6';

type Status = 'Исправно' | 'В ремонте' | 'План ТО';

interface Repair {
  id: number;
  repair_date: string;
  repair_type: string;
  description: string;
  master: string;
  status: 'Выполнен' | 'Плановый';
}

interface Equipment {
  id: number;
  inv_number: string;
  name: string;
  category: string;
  location: string;
  status: Status;
  installed: string | null;
  repairs: Repair[];
}

const statusStyles: Record<string, string> = {
  'Исправно': 'bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]',
  'В ремонте': 'bg-destructive/12 text-destructive',
  'План ТО': 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]',
};

const emptyEq = { inv_number: '', name: '', category: '', location: '', status: 'Исправно', installed: '' };
const emptyRepair = { repair_date: '', repair_type: 'ТО', description: '', master: '', status: 'Выполнен' };

function Index() {
  const [data, setData] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [eqForm, setEqForm] = useState({ ...emptyEq });
  const [repairForm, setRepairForm] = useState({ ...emptyRepair });
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('Все');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      const json = await res.json();
      setData(json.equipment || []);
    } catch {
      toast({ title: 'Ошибка загрузки данных', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((e) => {
      const matchQuery = !q ||
        e.inv_number.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'Все' || e.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [query, statusFilter, data]);

  const totalRepairs = data.reduce((s, e) => s + e.repairs.filter((r) => r.status === 'Выполнен').length, 0);
  const planned = data.reduce((s, e) => s + e.repairs.filter((r) => r.status === 'Плановый').length, 0);
  const inRepair = data.filter((e) => e.status === 'В ремонте').length;

  const selected = data.find((e) => e.id === active) ?? null;

  const reportByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    data.forEach((e) => { m[e.category || 'Без категории'] = (m[e.category || 'Без категории'] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const reportByMaster = useMemo(() => {
    const m: Record<string, number> = {};
    data.forEach((e) => e.repairs.forEach((r) => {
      if (r.status === 'Выполнен' && r.master && r.master !== '—') m[r.master] = (m[r.master] || 0) + 1;
    }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const saveEquipment = async () => {
    if (!eqForm.inv_number.trim() || !eqForm.name.trim()) {
      toast({ title: 'Заполните инвентарный номер и наименование', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API, { method: 'POST', body: JSON.stringify(eqForm) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ title: 'Оборудование добавлено' });
      setAddOpen(false);
      setEqForm({ ...emptyEq });
      await load();
    } catch (e) {
      toast({ title: (e as Error).message || 'Ошибка сохранения', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveRepair = async () => {
    if (!selected || !repairForm.repair_date) {
      toast({ title: 'Укажите дату ремонта', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        body: JSON.stringify({ action: 'add_repair', equipment_id: selected.id, ...repairForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ title: 'Запись о ремонте добавлена' });
      setRepairOpen(false);
      setRepairForm({ ...emptyRepair });
      await load();
    } catch (e) {
      toast({ title: (e as Error).message || 'Ошибка сохранения', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

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
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setReportOpen(true)}>
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
              { label: 'Единиц оборудования', value: data.length, icon: 'Boxes' },
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-semibold tracking-tight">Каталог оборудования</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {['Все', 'Исправно', 'В ремонте', 'План ТО'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-secondary'
                }`}
              >
                {s}
                {s !== 'Все' && (
                  <span className="ml-1.5 font-mono opacity-70">
                    {data.filter((e) => e.status === s).length}
                  </span>
                )}
              </button>
            ))}
            <div className="w-px h-5 bg-border mx-1" />
            <div className="font-mono text-xs text-muted-foreground">{filtered.length} из {data.length}</div>
            <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
              <Icon name="Plus" size={15} /> Добавить
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-secondary/60 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3 font-mono">Инв. номер</div>
            <div className="col-span-4">Наименование</div>
            <div className="col-span-3">Расположение</div>
            <div className="col-span-2 text-right">Статус</div>
          </div>

          {loading && (
            <div className="px-5 py-16 text-center text-muted-foreground">
              <Icon name="LoaderCircle" size={28} className="mx-auto mb-3 animate-spin opacity-50" />
              Загрузка данных…
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="px-5 py-16 text-center text-muted-foreground">
              <Icon name="SearchX" size={32} className="mx-auto mb-3 opacity-40" />
              {query ? `Ничего не найдено по запросу «${query}»` : 'Пока нет оборудования'}
            </div>
          )}

          {!loading && filtered.map((e, i) => (
            <button
              key={e.id}
              onClick={() => setActive(e.id)}
              className="w-full text-left grid grid-cols-2 md:grid-cols-12 gap-x-4 gap-y-1 px-5 py-4 border-b border-border last:border-0 hover:bg-secondary/40 transition-colors animate-fade-in"
              style={{ animationDelay: `${i * 40}ms`, opacity: 0 }}
            >
              <div className="md:col-span-3 font-mono text-sm font-medium text-accent">{e.inv_number}</div>
              <div className="md:col-span-4 col-span-2">
                <div className="font-medium leading-tight">{e.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{e.category}</div>
              </div>
              <div className="md:col-span-3 text-sm text-muted-foreground self-center">{e.location}</div>
              <div className="md:col-span-2 flex md:justify-end items-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[e.status] || ''}`}>
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
                <div className="font-mono text-sm text-accent">{selected.inv_number}</div>
                <DialogTitle className="text-2xl tracking-tight">{selected.name}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { label: 'Категория', value: selected.category || '—', icon: 'Tag' },
                  { label: 'Расположение', value: selected.location || '—', icon: 'MapPin' },
                  { label: 'Введён в строй', value: selected.installed || '—', icon: 'Calendar' },
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
                  {selected.repairs.length === 0 && (
                    <div className="text-sm text-muted-foreground py-4 text-center">Ремонтов пока нет</div>
                  )}
                  {selected.repairs.map((r) => (
                    <div key={r.id} className="flex gap-3 rounded-lg border border-border p-3">
                      <div className="mt-0.5">
                        <div className={`w-2 h-2 rounded-full ${r.status === 'Выполнен' ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--warning))]'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{r.repair_type} — {r.description}</span>
                          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{r.repair_date}</span>
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
                <Button className="flex-1 gap-2" onClick={() => { setRepairForm({ ...emptyRepair }); setRepairOpen(true); }}>
                  <Icon name="Plus" size={15} /> Добавить ремонт
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add equipment dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новое оборудование</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Инвентарный номер (INV-…)" className="font-mono" value={eqForm.inv_number} onChange={(e) => setEqForm({ ...eqForm, inv_number: e.target.value })} />
            <Input placeholder="Наименование" value={eqForm.name} onChange={(e) => setEqForm({ ...eqForm, name: e.target.value })} />
            <Input placeholder="Категория" value={eqForm.category} onChange={(e) => setEqForm({ ...eqForm, category: e.target.value })} />
            <Input placeholder="Расположение" value={eqForm.location} onChange={(e) => setEqForm({ ...eqForm, location: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={eqForm.status} onValueChange={(v) => setEqForm({ ...eqForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Исправно">Исправно</SelectItem>
                  <SelectItem value="В ремонте">В ремонте</SelectItem>
                  <SelectItem value="План ТО">План ТО</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={eqForm.installed} onChange={(e) => setEqForm({ ...eqForm, installed: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEquipment} disabled={saving} className="w-full gap-2">
              {saving && <Icon name="LoaderCircle" size={15} className="animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add repair dialog */}
      <Dialog open={repairOpen} onOpenChange={setRepairOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая запись о ремонте</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Select value={repairForm.repair_type} onValueChange={(v) => setRepairForm({ ...repairForm, repair_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ТО">ТО</SelectItem>
                  <SelectItem value="Ремонт">Ремонт</SelectItem>
                  <SelectItem value="Диагностика">Диагностика</SelectItem>
                  <SelectItem value="Замена">Замена</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={repairForm.repair_date} onChange={(e) => setRepairForm({ ...repairForm, repair_date: e.target.value })} />
            </div>
            <Input placeholder="Описание работ" value={repairForm.description} onChange={(e) => setRepairForm({ ...repairForm, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Мастер" value={repairForm.master} onChange={(e) => setRepairForm({ ...repairForm, master: e.target.value })} />
              <Select value={repairForm.status} onValueChange={(v) => setRepairForm({ ...repairForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Выполнен">Выполнен</SelectItem>
                  <SelectItem value="Плановый">Плановый</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveRepair} disabled={saving} className="w-full gap-2">
              {saving && <Icon name="LoaderCircle" size={15} className="animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Icon name="FileText" size={18} /> Сводный отчёт</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[
              { label: 'Оборудования', value: data.length },
              { label: 'Ремонтов', value: totalRepairs },
              { label: 'Плановых', value: planned },
              { label: 'В ремонте', value: inRepair },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-3 text-center">
                <div className="font-mono text-xl font-semibold">{s.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Icon name="Tag" size={14} /> По категориям</h4>
            <div className="space-y-1.5">
              {reportByCategory.map(([cat, n]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm w-32 truncate">{cat}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${(n / Math.max(data.length, 1)) * 100}%` }} />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground w-6 text-right">{n}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Icon name="UserCheck" size={14} /> Выполнено по мастерам</h4>
            <div className="space-y-1.5">
              {reportByMaster.length === 0 && <div className="text-sm text-muted-foreground">Нет данных</div>}
              {reportByMaster.map(([m, n]) => (
                <div key={m} className="flex items-center justify-between text-sm border-b border-border pb-1.5">
                  <span>{m}</span>
                  <span className="font-mono text-muted-foreground">{n} ремонт(ов)</span>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Icon name="Printer" size={15} /> Печать отчёта
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="border-t border-border mt-6">
        <div className="container max-w-6xl py-6 flex items-center justify-between">
          <div className="font-mono text-xs text-muted-foreground">РемУчёт · v0.2</div>
        </div>
      </footer>
    </div>
  );
}

export default Index;