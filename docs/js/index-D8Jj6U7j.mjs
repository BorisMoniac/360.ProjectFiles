var d = /* @__PURE__ */ ((e) => (e[e.Hidden = 1] = "Hidden", e[e.Loading = 2] = "Loading", e[e.Loaded = 3] = "Loaded", e[e.Error = 4] = "Error", e))(d || {});
const m = [
  {
    name: "Модели и чертежи",
    extensions: ["smdx", "ifc", "ifcxml", "ifczip", "dwg", "dxf", "xml", "land", "gltf", "glb", "obj", "las", "laz", "txt", "csv"]
  },
  { name: "Топоматик 360 (*.smdx)", extensions: ["smdx"] },
  { name: "IFC (*.ifc, *.ifcxml, *.ifczip)", extensions: ["ifc", "ifcxml", "ifczip"] },
  { name: "Чертежи AutoCAD (*.dwg, *.dxf)", extensions: ["dwg", "dxf"] }
];
function l(e) {
  const n = e.root?.title;
  if (n) return n;
  const a = (e.origin ?? "").split(/[\/\\]/).pop() ?? "";
  return decodeURIComponent(a) || "Без имени";
}
function k(e) {
  const n = l(e), t = n.lastIndexOf(".");
  return t > 0 ? n.slice(0, t) : n;
}
async function M(e) {
  try {
    const n = await e.bookmark?.();
    if (n) return n;
  } catch {
  }
  return e.origin;
}
function j(e) {
  return e ? (Array.isArray(e) ? e : [e]).filter((t) => !!t) : [];
}
async function L(e, n, t) {
  const a = [
    {
      name: "диалог открытия",
      run: () => e.openDialog({ multiSelections: !0, buttonLabel: "Выбрать", message: n, filters: m })
    },
    {
      name: "обозреватель хранилищ",
      run: () => e.openStorageFiles({
        id: "nashepo.projectfiles.picker",
        title: n,
        canPickMany: !0,
        allowLocal: !0,
        filters: m
      })
    },
    {
      name: "диалог открытия без фильтров",
      run: () => e.openDialog({ multiSelections: !0 })
    },
    {
      name: "диалог открытия по одному файлу",
      run: () => e.openDialog({ buttonLabel: "Выбрать" })
    }
  ], i = [];
  for (const s of a) {
    const r = Date.now();
    try {
      const c = j(await s.run()), o = Date.now() - r;
      if (c.length)
        return t.appendLine(`Выбор файлов: ${s.name}, выбрано ${c.length}`), c;
      if (o >= 400)
        return t.appendLine(`Выбор файлов отменён пользователем (${s.name}).`), [];
      t.appendLine(`Способ «${s.name}» не открыл окно (${o} мс), пробую следующий.`), i.push(`${s.name}: окно не открылось`);
    } catch (c) {
      const o = c?.message ?? String(c);
      t.appendLine(`Способ «${s.name}» завершился ошибкой: ${o}`), i.push(`${s.name}: ${o}`);
    }
  }
  return t.appendLine("Ни один способ выбора файлов не сработал."), t.show(), await e.showMessage(
    ["Не удалось открыть окно выбора файлов.", ...i],
    "error"
  ), [];
}
function $(e) {
  const n = /* @__PURE__ */ new Set(), t = [];
  for (const a of e) {
    const i = (a.origin ?? "") + "|" + l(a);
    n.has(i) || (n.add(i), t.push(a));
  }
  return t;
}
function p(e) {
  if (!e) return;
  const n = e.model;
  if (!(!n || typeof n != "object" || !("attachments" in n)))
    return n.project ?? n;
}
function g(e) {
  return p(e.app) ?? p(e.manager.activeApp);
}
function v(e) {
  if (!e) return "проект";
  const n = e.workspace?.root?.title;
  return n || (e.windows[0]?.title ?? "проект");
}
async function E(e, n = 12e4) {
  const t = Date.now() + n;
  for (; ; ) {
    const a = p(e);
    if (a) return a;
    if (Date.now() > t) return;
    await z(100);
  }
}
async function P(e, n) {
  const t = e.layers.itemByName(n);
  if (t) return t;
  try {
    return await e.layers.add({ name: n });
  } catch {
    return e.layers.layer0;
  }
}
function D(e, n, t) {
  return e.attachments.find((a) => a.uri === n || !!a.name && a.name === t);
}
async function F(e, n, t) {
  const a = k(n), i = l(n);
  try {
    const s = await M(n);
    if (!s)
      return t.appendLine(`✗ ${i}: не удалось определить адрес файла`), { name: i, status: "failed", message: "нет адреса файла" };
    const r = D(e, s, a);
    if (r)
      return t.appendLine(`= ${i}: уже подключён к проекту`), r.state !== d.Loaded && await r.show(), { name: i, status: "exists" };
    const c = await P(e, a), o = await e.attachments.add({ name: a, uri: s, layer: c });
    return await o.show(), o.state === d.Error ? (t.appendLine(`✗ ${i}: загрузка завершилась ошибкой`), { name: i, status: "failed", message: "ошибка загрузки" }) : (t.appendLine(`+ ${i}: подключён`), { name: i, status: "added" });
  } catch (s) {
    const r = s?.message ?? String(s);
    return t.appendLine(`✗ ${i}: ${r}`), { name: i, status: "failed", message: r };
  }
}
async function y(e, n, t, a) {
  const i = [], s = e.beginProgress();
  s.indeterminate = !1, s.label = "Подключение файлов к проекту";
  try {
    for (let r = 0; r < t.length; r++)
      s.details = l(t[r]), s.percents = Math.round(r / t.length * 100), i.push(await F(n, t[r], a));
    s.percents = 100;
  } finally {
    e.endProgress(s);
  }
  return i;
}
function b(e) {
  const n = e.filter((s) => s.status === "added").length, t = e.filter((s) => s.status === "exists").length, a = e.filter((s) => s.status === "failed"), i = [`Подключено файлов: ${n}`];
  return t && i.push(`уже было в проекте: ${t}`), a.length && i.push(`не удалось: ${a.length} (${a.map((s) => s.name).join(", ")})`), i.join(". ") + ".";
}
function z(e) {
  return new Promise((n) => setTimeout(n, e));
}
const C = "Создание проекта";
function w(e) {
  return e.createOutputChannel(C);
}
async function u(e, n, t) {
  const a = w(e);
  a.appendLine(`— ${n} —`);
  try {
    await t(a);
  } catch (i) {
    const s = i?.message ?? String(i);
    a.appendLine(`Ошибка: ${s}`);
    const r = i?.stack;
    r && a.appendLine(r), a.show(), await e.showMessage([`${n}: ${s}`, "Подробности в канале вывода «Создание проекта»."], "error");
  }
}
function H(e) {
  const n = w(e);
  return u(e, "Создание проекта", async () => {
    const t = $(await L(e, "Выберите файлы, которые нужно открыть в одном проекте", n));
    if (!t.length) return;
    n.appendLine(`Выбрано файлов: ${t.length}`);
    for (const o of t) n.appendLine(`  · ${l(o)}`);
    const a = e.manager.activeApp;
    let i = p(a), s = t;
    if (i) {
      const o = await e.showQuickPick(
        [
          { label: "Новый проект", description: `на основе файла «${l(t[0])}»`, value: "new" },
          { label: "Текущий проект", description: v(a), value: "current" }
        ],
        { title: "Создание проекта", placeHolder: "Куда добавить выбранные файлы" }
      );
      if (!o) {
        n.appendLine("Отменено пользователем.");
        return;
      }
      o.value === "new" && (i = void 0);
    }
    if (!i) {
      const o = t[0];
      n.appendLine(`Открываю проект: ${l(o)}`);
      const f = await e.manager.openWorkspace(o);
      if (i = await E(f), !i) {
        n.appendLine("Не удалось получить модель проекта. Формат первого файла не поддерживается как проект."), n.show(), await e.showMessage(
          `Файл «${l(o)}» не открылся как проект. Выберите первым файл проекта или откройте проект вручную.`,
          "error"
        );
        return;
      }
      s = t.slice(1);
    }
    if (!s.length) {
      n.appendLine("Дополнительных файлов нет."), await e.showMessage("Проект открыт. Дополнительных файлов для подключения не выбрано.", "info");
      return;
    }
    const r = await y(e, i, s, n), c = b(r);
    n.appendLine(c), await e.showMessage(c, r.some((o) => o.status === "failed") ? "warning" : "info");
  });
}
function I(e) {
  const n = w(e);
  return u(e, "Добавление файлов", async () => {
    const t = g(e);
    if (!t) {
      await e.showMessage("Нет открытого проекта. Используйте команду «Создать проект».", "warning");
      return;
    }
    const a = $(await L(e, "Выберите файлы для добавления в проект", n));
    if (!a.length) return;
    n.appendLine(`Добавление файлов в проект: ${a.length}`);
    const i = await y(e, t, a, n), s = b(i);
    n.appendLine(s), await e.showMessage(s, i.some((r) => r.status === "failed") ? "warning" : "info");
  });
}
function N(e) {
  return u(e, "Обновление вложений", async (n) => {
    const t = g(e);
    if (!t) {
      await e.showMessage("Нет открытого проекта.", "warning");
      return;
    }
    const a = [];
    if (t.attachments.forEach((c) => {
      a.push(c);
    }), !a.length) {
      await e.showMessage("В проекте нет вложений.", "info");
      return;
    }
    n.show(!0), n.appendLine(`Обновление вложений: ${a.length}`);
    let i = 0;
    const s = e.beginProgress();
    s.indeterminate = !1, s.label = "Обновление вложений";
    try {
      for (let c = 0; c < a.length; c++) {
        const o = a[c], f = o.name ?? o.uri ?? "вложение";
        s.details = f, s.percents = Math.round(c / a.length * 100);
        try {
          await o.show(), n.appendLine(`+ ${f}`);
        } catch (h) {
          i++, n.appendLine(`- ${f}: ${h?.message ?? String(h)}`);
        }
      }
      s.percents = 100;
    } finally {
      e.endProgress(s);
    }
    const r = i ? `Обновлено вложений: ${a.length - i}. Не удалось: ${i}.` : `Обновлено вложений: ${a.length}.`;
    n.appendLine(r), await e.showMessage(r, i ? "warning" : "info");
  });
}
function _(e) {
  return u(e, "Состав проекта", async (n) => {
    n.show();
    const t = g(e);
    if (!t) {
      n.appendLine("Нет открытого проекта."), await e.showMessage("Нет открытого проекта.", "warning");
      return;
    }
    let a = 0;
    t.attachments.forEach((i) => {
      a++, n.appendLine(`${a}. ${i.name ?? "без имени"} — ${O(i.state)}`), i.uri && n.appendLine(`   ${i.uri}`);
    }), n.appendLine(a ? `Всего вложений: ${a}` : "Вложений нет.");
  });
}
function O(e) {
  switch (e) {
    case d.Loaded:
      return "загружено";
    case d.Loading:
      return "загружается";
    case d.Hidden:
      return "скрыто";
    case d.Error:
      return "ошибка загрузки";
    default:
      return "состояние неизвестно";
  }
}
const T = {
  create_project: H,
  add_files: I,
  reload_attachments: N,
  list_attachments: _
};
export {
  T as default
};
