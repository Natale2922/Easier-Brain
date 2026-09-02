import React, { useMemo, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Command,
  Home,
  Inbox,
  Mic,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Tag,
  X,
} from "lucide-react";

type Task = {
  id: number;
  title: string;
  course: string;
  courseColor: string;
  date: string;
  time?: string;
  priority: "Alta" | "Media" | "Baja";
  completed: boolean;
};

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Ensayo: la ciudad después de la lluvia",
    course: "Literatura",
    courseColor: "#BE6C81",
    date: "Hoy",
    time: "18:00",
    priority: "Alta",
    completed: false,
  },
  {
    id: 2,
    title: "Resolver problemas 4 — 8",
    course: "Cálculo II",
    courseColor: "#5D75B8",
    date: "Hoy",
    time: "23:59",
    priority: "Media",
    completed: false,
  },
  {
    id: 3,
    title: "Lectura: capítulo siete",
    course: "Historia del arte",
    courseColor: "#668E79",
    date: "Mañana",
    time: "09:30",
    priority: "Baja",
    completed: false,
  },
  {
    id: 4,
    title: "Guía de laboratorio",
    course: "Química orgánica",
    courseColor: "#B37A48",
    date: "Jue, 14 mar",
    priority: "Media",
    completed: false,
  },
];

const priorityColor: Record<Task["priority"], string> = {
  Alta: "#C26373",
  Media: "#BB7B38",
  Baja: "#4E8A72",
};

function IconButton({
  label,
  children,
  onClick,
  active = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={`icon-button${active ? " icon-button-active" : ""}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function TaskRow({
  task,
  onToggle,
  onOpen,
}: {
  task: Task;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <div className={`task-row${task.completed ? " task-row-complete" : ""}`}>
      <button
        aria-label={task.completed ? `Marcar ${task.title} como pendiente` : `Completar ${task.title}`}
        className="task-check"
        onClick={onToggle}
        type="button"
      >
        {task.completed ? <Check size={14} strokeWidth={3} /> : <Circle size={21} strokeWidth={1.6} />}
      </button>
      <button className="task-main" onClick={onOpen} type="button">
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <span className="course-dot" style={{ backgroundColor: task.courseColor }} />
          {task.course}
          <span className="meta-separator">·</span>
          <Clock3 size={12} />
          {task.date}{task.time ? `, ${task.time}` : ""}
        </span>
      </button>
      <span className="priority-mark" style={{ backgroundColor: priorityColor[task.priority] }} title={`Prioridad ${task.priority}`} />
      <button aria-label={`Más opciones para ${task.title}`} className="row-more" onClick={onOpen} type="button">
        <MoreHorizontal size={17} />
      </button>
    </div>
  );
}

export default function TaskReminderRefined() {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState("Inicio");
  const [taskFilter, setTaskFilter] = useState<"Hoy" | "Próximas">("Hoy");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState("");

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return tasks.filter((task) => {
      const matchesFilter = taskFilter === "Hoy" ? task.date === "Hoy" : task.date !== "Hoy";
      const matchesSearch = !query || `${task.title} ${task.course}`.toLocaleLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [search, taskFilter, tasks]);

  const completed = tasks.filter((task) => task.completed).length;
  const progress = Math.round((completed / 7) * 100);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleTask = (id: number) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
    showToast("Tarea actualizada");
  };

  const submitTask = () => {
    const title = newTask.trim();
    if (!title) {
      showToast("Escribe una tarea para continuar");
      return;
    }
    setTasks((current) => [
      {
        id: Date.now(),
        title,
        course: "Personal",
        courseColor: "#7562B6",
        date: "Hoy",
        priority: "Media",
        completed: false,
      },
      ...current,
    ]);
    setNewTask("");
    setComposerOpen(false);
    setTaskFilter("Hoy");
    showToast("Nueva tarea añadida");
  };

  return (
    <div className="mockup-stage">
      <style>{`
        :root {
          color-scheme: light;
          --ink: #29213f;
          --muted: #8a819d;
          --line: #ebe5f3;
          --paper: #fbf9ff;
          --card: #fffdfd;
          --violet: #7056c7;
          --violet-soft: #eee9ff;
          --lilac: #e5ddff;
        }
        * { box-sizing: border-box; }
        .mockup-stage {
          min-height: 100vh;
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 26px 14px;
          background: #ece8f4;
          color: var(--ink);
          font-family: "DM Sans", "Avenir Next", ui-sans-serif, system-ui, sans-serif;
        }
        .phone {
          position: relative;
          width: min(100%, 410px);
          min-height: 840px;
          overflow: hidden;
          border: 1px solid #e1dbea;
          border-radius: 34px;
          background:
            radial-gradient(circle at 88% 2%, #efe9ff 0, rgba(239,233,255,0) 27%),
            var(--paper);
          box-shadow: 0 24px 70px rgba(53, 39, 83, .18), 0 2px 10px rgba(53, 39, 83, .05);
        }
        .phone-scroll {
          height: 100%;
          min-height: 840px;
          overflow: auto;
          padding: 18px 19px 104px;
          scrollbar-width: none;
        }
        .phone-scroll::-webkit-scrollbar { display: none; }
        button { font: inherit; }
        .topbar { height: 45px; display: flex; align-items: center; justify-content: space-between; }
        .brand { display: flex; align-items: center; gap: 10px; background: none; border: 0; padding: 0; color: var(--ink); cursor: pointer; }
        .brand-mark {
          display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px;
          color: #fff; background: var(--violet); box-shadow: 0 6px 14px rgba(112,86,199,.22);
        }
        .brand-mark span { font: 700 17px Georgia, serif; letter-spacing: -2px; transform: translateX(-1px); }
        .brand-name { font: 700 18px Georgia, "Times New Roman", serif; letter-spacing: -.5px; }
        .brand-name em { color: var(--violet); font-style: normal; }
        .top-actions { display: flex; align-items: center; gap: 9px; }
        .icon-button {
          position: relative; display: grid; place-items: center; width: 36px; height: 36px;
          border: 1px solid var(--line); border-radius: 12px; color: var(--muted); background: rgba(255,253,253,.72);
          cursor: pointer; transition: background .18s ease, color .18s ease, transform .18s ease;
        }
        .icon-button:hover { color: var(--violet); background: #f1edff; transform: translateY(-1px); }
        .icon-button-active { color: var(--violet); background: var(--violet-soft); border-color: #d9cdfb; }
        .notification-dot { position: absolute; right: 8px; top: 7px; width: 6px; height: 6px; border: 1px solid var(--card); border-radius: 99px; background: #cc6878; }
        .avatar { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; border: 1px solid #d8cef1; color: #66529d; background: #e9e1ff; font-size: 12px; font-weight: 800; cursor: pointer; }
        .eyebrow { display: flex; align-items: center; gap: 7px; margin: 26px 0 6px; color: var(--muted); font-size: 12px; letter-spacing: .01em; }
        .eyebrow-dot { width: 6px; height: 6px; border-radius: 99px; background: #5c9a7f; box-shadow: 0 0 0 3px #dceee5; }
        .heading { margin: 0; max-width: 290px; font: 700 31px/1.08 Georgia, "Times New Roman", serif; letter-spacing: -1.2px; }
        .heading-accent { color: var(--violet); }
        .date-line { margin: 10px 0 22px; color: var(--muted); font-size: 12px; }
        .focus-card {
          position: relative; overflow: hidden; min-height: 152px; padding: 19px 18px;
          border-radius: 20px; color: #fff; background: #7158c7;
          box-shadow: 0 12px 24px rgba(112,86,199,.18);
        }
        .focus-card:after { content: ""; position: absolute; right: -42px; top: -52px; width: 168px; height: 168px; border: 1px solid rgba(255,255,255,.18); border-radius: 50%; box-shadow: 0 0 0 17px rgba(255,255,255,.045), 0 0 0 34px rgba(255,255,255,.035); }
        .focus-kicker { display: flex; align-items: center; gap: 7px; color: #e8e1ff; font-size: 10px; font-weight: 700; letter-spacing: .11em; text-transform: uppercase; }
        .focus-title { margin: 12px 0 4px; font: 700 22px/1.08 Georgia, serif; letter-spacing: -.5px; }
        .focus-subtitle { color: #ded7fb; font-size: 11px; }
        .progress-ring { position: absolute; right: 21px; bottom: 20px; width: 54px; height: 54px; border: 5px solid rgba(255,255,255,.22); border-top-color: #fff; border-right-color: #fff; border-radius: 50%; transform: rotate(23deg); }
        .progress-value { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; font-size: 12px; font-weight: 800; transform: rotate(-23deg); }
        .stats { display: grid; grid-template-columns: 1.08fr .96fr .96fr; gap: 8px; margin: 13px 0 22px; }
        .stat { min-height: 70px; padding: 12px 11px 10px; border: 1px solid var(--line); border-radius: 15px; background: rgba(255,253,253,.72); }
        .stat-number { display: block; color: var(--ink); font-size: 20px; font-weight: 800; letter-spacing: -.8px; }
        .stat-label { display: block; margin-top: 3px; color: var(--muted); font-size: 10px; }
        .stat:first-child .stat-number { color: var(--violet); }
        .section-top { display: flex; align-items: flex-end; justify-content: space-between; margin: 0 0 11px; }
        .section-title { margin: 0; font-size: 16px; font-weight: 800; letter-spacing: -.35px; }
        .section-link { display: flex; align-items: center; gap: 2px; border: 0; color: var(--violet); background: none; cursor: pointer; font-size: 11px; font-weight: 700; }
        .section-link:hover { text-decoration: underline; }
        .search-wrap { display: flex; align-items: center; gap: 8px; height: 0; margin-bottom: 0; overflow: hidden; opacity: 0; transition: height .2s ease, margin .2s ease, opacity .2s ease; }
        .search-wrap-open { height: 39px; margin-bottom: 10px; opacity: 1; }
        .search-input { width: 100%; height: 38px; padding: 0 12px; border: 1px solid #dcd3ee; border-radius: 12px; outline: 0; color: var(--ink); background: #fffdfd; font-size: 12px; }
        .search-input:focus { border-color: #ad99e6; box-shadow: 0 0 0 3px #eee9ff; }
        .filter-row { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
        .filter-chip { padding: 7px 12px; border: 1px solid transparent; border-radius: 99px; color: var(--muted); background: transparent; cursor: pointer; font-size: 11px; font-weight: 700; }
        .filter-chip-active { border-color: #ded3fa; color: var(--violet); background: var(--violet-soft); }
        .task-list { display: grid; gap: 7px; }
        .task-row { display: flex; align-items: center; min-height: 72px; padding: 7px 8px 7px 10px; border: 1px solid var(--line); border-radius: 16px; background: rgba(255,253,253,.82); transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease; }
        .task-row:hover { border-color: #d6c9f3; box-shadow: 0 6px 16px rgba(72,53,108,.06); transform: translateY(-1px); }
        .task-row-complete { opacity: .58; }
        .task-check, .row-more { display: grid; place-items: center; flex: 0 0 auto; border: 0; color: #b4aac5; background: none; cursor: pointer; }
        .task-check { width: 28px; height: 40px; margin-right: 5px; }
        .task-check:hover { color: var(--violet); }
        .task-main { display: grid; flex: 1; min-width: 0; gap: 5px; padding: 5px 4px; border: 0; text-align: left; background: none; cursor: pointer; }
        .task-title { overflow: hidden; color: var(--ink); font-size: 12px; font-weight: 700; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
        .task-row-complete .task-title { text-decoration: line-through; }
        .task-meta { display: flex; align-items: center; gap: 4px; overflow: hidden; color: var(--muted); font-size: 10px; white-space: nowrap; }
        .course-dot { width: 6px; height: 6px; flex: 0 0 auto; border-radius: 50%; }
        .meta-separator { color: #c8c0d2; margin: 0 1px; }
        .priority-mark { width: 3px; height: 24px; margin: 0 7px 0 4px; border-radius: 99px; opacity: .85; }
        .row-more { width: 22px; height: 30px; color: #bab0c8; }
        .empty-state { padding: 24px 15px; border: 1px dashed #d8cdeb; border-radius: 16px; text-align: center; color: var(--muted); font-size: 12px; }
        .smart-add { display: flex; align-items: center; gap: 9px; min-height: 51px; margin-top: 20px; padding: 7px 8px 7px 13px; border: 1px solid #ddd4ef; border-radius: 16px; background: #f3effc; }
        .smart-add-icon { color: var(--violet); }
        .smart-placeholder { flex: 1; border: 0; outline: 0; color: var(--muted); background: none; font-size: 11px; text-align: left; cursor: pointer; }
        .smart-placeholder:hover { color: var(--violet); }
        .smart-mic { display: grid; place-items: center; width: 28px; height: 28px; border: 0; color: var(--violet); background: none; cursor: pointer; }
        .smart-submit { display: grid; place-items: center; width: 35px; height: 35px; border: 0; border-radius: 11px; color: #fff; background: var(--violet); cursor: pointer; box-shadow: 0 5px 10px rgba(112,86,199,.22); }
        .smart-submit:hover { background: #6046b4; }
        .helper { margin: 7px 0 0 14px; color: #9b91aa; font-size: 10px; }
        .bottom-nav { position: absolute; bottom: 0; left: 0; right: 0; display: grid; grid-template-columns: repeat(4, 1fr); height: 76px; padding: 10px 14px 12px; border-top: 1px solid rgba(231,224,241,.9); background: rgba(251,249,255,.94); backdrop-filter: blur(12px); }
        .nav-item { display: grid; place-items: center; align-content: center; gap: 4px; border: 0; color: #a299ae; background: none; cursor: pointer; font-size: 9px; font-weight: 700; }
        .nav-item-active { color: var(--violet); }
        .nav-icon { display: grid; place-items: center; width: 35px; height: 28px; border-radius: 10px; }
        .nav-item-active .nav-icon { background: var(--violet-soft); }
        .fab { position: absolute; right: 21px; bottom: 90px; display: grid; place-items: center; width: 49px; height: 49px; border: 4px solid var(--paper); border-radius: 17px; color: #fff; background: var(--violet); box-shadow: 0 8px 18px rgba(112,86,199,.3); cursor: pointer; transition: transform .18s ease; }
        .fab:hover { transform: translateY(-3px) rotate(4deg); }
        .scrim { position: absolute; inset: 0; z-index: 4; display: flex; align-items: flex-end; background: rgba(38,28,61,.28); }
        .sheet { width: 100%; padding: 9px 19px 28px; border-radius: 25px 25px 0 0; background: var(--paper); box-shadow: 0 -12px 30px rgba(44,31,69,.14); animation: sheet-in .22s ease-out; }
        @keyframes sheet-in { from { transform: translateY(22px); opacity: .3; } to { transform: translateY(0); opacity: 1; } }
        .sheet-handle { width: 35px; height: 4px; margin: 0 auto 20px; border-radius: 9px; background: #dcd3e7; }
        .sheet-top { display: flex; align-items: center; justify-content: space-between; }
        .sheet-kicker { color: var(--violet); font-size: 10px; font-weight: 800; letter-spacing: .11em; text-transform: uppercase; }
        .sheet-close { display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 10px; color: var(--muted); background: #f0ebf8; cursor: pointer; }
        .sheet h2 { margin: 15px 0 8px; font: 700 23px/1.12 Georgia, serif; letter-spacing: -.7px; }
        .sheet-detail { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 11px; }
        .sheet-detail + .sheet-detail { margin-top: 8px; }
        .sheet-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 23px; }
        .sheet-action { height: 41px; border: 1px solid #ddd4ee; border-radius: 12px; color: var(--ink); background: #fffdfd; cursor: pointer; font-size: 11px; font-weight: 800; }
        .sheet-action-primary { border-color: var(--violet); color: #fff; background: var(--violet); }
        .composer-title { margin: 15px 0 17px !important; }
        .composer-input { width: 100%; min-height: 80px; resize: none; padding: 13px; border: 1px solid #dcd3ee; border-radius: 13px; outline: 0; color: var(--ink); background: #fffdfd; font-size: 13px; }
        .composer-input:focus { border-color: #ad99e6; box-shadow: 0 0 0 3px #eee9ff; }
        .composer-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
        .composer-note { color: var(--muted); font-size: 10px; }
        .composer-submit { height: 39px; padding: 0 15px; border: 0; border-radius: 12px; color: #fff; background: var(--violet); cursor: pointer; font-size: 11px; font-weight: 800; }
        .notification-pop { position: absolute; z-index: 3; top: 62px; right: 18px; width: 228px; padding: 14px; border: 1px solid #e1d8f0; border-radius: 15px; background: #fffdfd; box-shadow: 0 12px 28px rgba(56,39,81,.14); animation: pop-in .16s ease-out; }
        @keyframes pop-in { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .notification-pop strong { display: block; font-size: 12px; }
        .notification-pop p { margin: 5px 0 0; color: var(--muted); font-size: 10px; line-height: 1.4; }
        .toast { position: absolute; z-index: 9; left: 50%; bottom: 88px; padding: 10px 14px; border-radius: 99px; color: #fff; background: #302649; box-shadow: 0 8px 18px rgba(45,34,64,.18); font-size: 11px; font-weight: 700; transform: translateX(-50%); animation: toast-in .2s ease-out; white-space: nowrap; }
        @keyframes toast-in { from { opacity: 0; transform: translate(-50%, 5px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @media (max-width: 440px) {
          .mockup-stage { padding: 0; background: var(--paper); }
          .phone { min-height: 100dvh; border: 0; border-radius: 0; box-shadow: none; }
          .phone-scroll { min-height: 100dvh; padding-top: 16px; }
        }
      `}</style>

      <main className="phone">
        <div className="phone-scroll">
          <header className="topbar">
            <button className="brand" onClick={() => { setActiveTab("Inicio"); showToast("Estás en Inicio"); }} type="button">
              <span className="brand-mark"><span>n</span></span>
              <span className="brand-name">nuvo<em>.</em></span>
            </button>
            <div className="top-actions">
              <IconButton label="Buscar tareas" active={searchOpen} onClick={() => setSearchOpen((open) => !open)}>
                <Search size={17} />
              </IconButton>
              <IconButton label="Ver notificaciones" active={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
                <Bell size={17} />
                <span className="notification-dot" />
              </IconButton>
              <button className="avatar" onClick={() => showToast("Perfil de Sofía")} type="button">SF</button>
            </div>
          </header>

          {notificationsOpen && (
            <div className="notification-pop">
              <strong>Todo en orden por aquí</strong>
              <p>Tu próximo recordatorio es el ensayo de Literatura, hoy a las 18:00.</p>
            </div>
          )}

          <p className="eyebrow"><span className="eyebrow-dot" /> Miércoles, 13 de marzo</p>
          <h1 className="heading">Vamos a tener<br />un gran <span className="heading-accent">día.</span></h1>
          <p className="date-line">Buenos días, Sofía. Tienes espacio para lo importante.</p>

          <section className="focus-card" aria-label="Resumen de progreso">
            <div className="focus-kicker"><Sparkles size={13} /> Tu foco de hoy</div>
            <div className="focus-title">Un paso a la vez.</div>
            <div className="focus-subtitle">2 tareas para cerrar antes de dormir</div>
            <div className="progress-ring"><span className="progress-value">{progress || 28}%</span></div>
          </section>

          <section className="stats" aria-label="Resumen de tareas">
            <div className="stat"><span className="stat-number">{tasks.filter((task) => task.date === "Hoy" && !task.completed).length}</span><span className="stat-label">para hoy</span></div>
            <div className="stat"><span className="stat-number">{tasks.filter((task) => task.date !== "Hoy").length}</span><span className="stat-label">próximas</span></div>
            <div className="stat"><span className="stat-number">{completed || "—"}</span><span className="stat-label">completadas</span></div>
          </section>

          <div className="section-top">
            <h2 className="section-title">Tu lista</h2>
            <button className="section-link" onClick={() => { setTaskFilter("Próximas"); showToast("Mostrando próximas"); }} type="button">Ver calendario <ChevronRight size={14} /></button>
          </div>
          <div className={`search-wrap${searchOpen ? " search-wrap-open" : ""}`}>
            <Search size={15} color="#988ea8" />
            <input autoFocus={searchOpen} className="search-input" onChange={(event) => setSearch(event.target.value)} placeholder="Busca una tarea o materia" value={search} />
          </div>
          <div className="filter-row">
            <button className={`filter-chip${taskFilter === "Hoy" ? " filter-chip-active" : ""}`} onClick={() => setTaskFilter("Hoy")} type="button">Hoy · {tasks.filter((task) => task.date === "Hoy").length}</button>
            <button className={`filter-chip${taskFilter === "Próximas" ? " filter-chip-active" : ""}`} onClick={() => setTaskFilter("Próximas")} type="button">Próximas · {tasks.filter((task) => task.date !== "Hoy").length}</button>
            <button aria-label="Filtrar por etiquetas" className="icon-button" onClick={() => showToast("Filtros disponibles pronto")} style={{ marginLeft: "auto", width: 31, height: 31, border: 0, background: "transparent" }} type="button"><Tag size={15} /></button>
          </div>
          <div className="task-list">
            {visibleTasks.length > 0 ? visibleTasks.map((task) => (
              <TaskRow key={task.id} onOpen={() => setSelectedTask(task)} onToggle={() => toggleTask(task.id)} task={task} />
            )) : <div className="empty-state">No encontramos tareas con ese filtro.</div>}
          </div>

          <div className="smart-add">
            <Sparkles className="smart-add-icon" size={16} />
            <button className="smart-placeholder" onClick={() => setComposerOpen(true)} type="button">Escribe o dicta lo que quieres hacer...</button>
            <button aria-label="Dictar tarea" className="smart-mic" onClick={() => { setComposerOpen(true); showToast("Puedes escribir tu tarea"); }} type="button"><Mic size={16} /></button>
            <button aria-label="Añadir tarea" className="smart-submit" onClick={() => setComposerOpen(true)} type="button"><ArrowUpRight size={17} /></button>
          </div>
          <p className="helper">Prueba: “Examen el viernes” · “Tarea de inglés mañana”</p>
        </div>

        <button aria-label="Añadir una tarea" className="fab" onClick={() => setComposerOpen(true)} type="button"><Plus size={22} /></button>
        <nav className="bottom-nav" aria-label="Navegación principal">
          {[
            { label: "Inicio", icon: Home },
            { label: "Tareas", icon: Inbox },
            { label: "Calendario", icon: CalendarDays },
            { label: "Archivo", icon: Archive },
          ].map(({ label, icon: NavIcon }) => (
            <button className={`nav-item${activeTab === label ? " nav-item-active" : ""}`} key={label} onClick={() => { setActiveTab(label); showToast(label === "Inicio" ? "Estás en Inicio" : `${label} seleccionado`); }} type="button">
              <span className="nav-icon"><NavIcon size={17} strokeWidth={activeTab === label ? 2.4 : 1.8} /></span>
              {label}
            </button>
          ))}
        </nav>

        {(selectedTask || composerOpen) && (
          <div className="scrim" onClick={() => { setSelectedTask(null); setComposerOpen(false); }}>
            <section className="sheet" onClick={(event) => event.stopPropagation()}>
              <div className="sheet-handle" />
              {selectedTask ? (
                <>
                  <div className="sheet-top">
                    <span className="sheet-kicker">{selectedTask.course}</span>
                    <button aria-label="Cerrar detalles" className="sheet-close" onClick={() => setSelectedTask(null)} type="button"><X size={15} /></button>
                  </div>
                  <h2>{selectedTask.title}</h2>
                  <div className="sheet-detail"><Clock3 size={14} color="#7056c7" /> {selectedTask.date}{selectedTask.time ? ` a las ${selectedTask.time}` : ""}</div>
                  <div className="sheet-detail"><BookOpen size={14} color="#7056c7" /> Prioridad {selectedTask.priority}</div>
                  <div className="sheet-actions">
                    <button className="sheet-action" onClick={() => setSelectedTask(null)} type="button">Cerrar</button>
                    <button className="sheet-action sheet-action-primary" onClick={() => { toggleTask(selectedTask.id); setSelectedTask(null); }} type="button">{selectedTask.completed ? "Reabrir tarea" : "Marcar lista"}</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="sheet-top">
                    <span className="sheet-kicker">Nueva tarea</span>
                    <button aria-label="Cerrar nueva tarea" className="sheet-close" onClick={() => setComposerOpen(false)} type="button"><X size={15} /></button>
                  </div>
                  <h2 className="composer-title">¿Qué quieres recordar?</h2>
                  <textarea autoFocus className="composer-input" onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submitTask(); }} placeholder="Ej. Entregar proyecto de diseño..." value={newTask} />
                  <div className="composer-footer">
                    <span className="composer-note"><Command size={11} /> + Enter para añadir</span>
                    <button className="composer-submit" onClick={submitTask} type="button">Añadir tarea</button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
        {toast && <div className="toast" role="status">{toast}</div>}
      </main>
    </div>
  );
}