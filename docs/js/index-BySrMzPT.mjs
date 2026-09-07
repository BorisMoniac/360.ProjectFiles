var f = /* @__PURE__ */ ((e) => (e[e.Hidden = 1] = "Hidden", e[e.Loading = 2] = "Loading", e[e.Loaded = 3] = "Loaded", e[e.Error = 4] = "Error", e))(f || {});
const y = [
  {
    name: "Модели и чертежи",
    extensions: ["smdx", "ifc", "ifcxml", "ifczip", "dwg", "dxf", "xml", "land", "gltf", "glb", "obj", "las", "laz", "txt", "csv"]
  },
  { name: "Топоматик 360 (*.smdx)", extensions: ["smdx"] },
  { name: "IFC (*.ifc, *.ifcxml, *.ifczip)", extensions: ["ifc", "ifcxml", "ifczip"] },
  { name: "Чертежи AutoCAD (*.dwg, *.dxf)", extensions: ["dwg", "dxf"] }
];
function p(e) {
  const n = e.root?.title;
  if (n) return n;
  const t = (e.origin ?? "").split(/[\/\\]/).pop() ?? "";
  return decodeURIComponent(t) || "Без имени";
}
function v(e) {
  const n = p(e), a = n.lastIndexOf(".");
  return a > 0 ? n.slice(0, a) : n;
}
async function D(e) {
  if (e.origin) return e.origin;
  try {
    const n = await e.bookmark?.();
    if (n) return n;
  } catch {
  }
}
function T(e) {
  return e ? (Array.isArray(e) ? e : [e]).filter((a) => !!a) : [];
}
async function b(e, n, a) {
  const t = [
    {
      name: "диалог открытия",
      run: () => e.openDialog({ multiSelections: !0, buttonLabel: "Выбрать", message: n, filters: y })
    },
    {
      name: "обозреватель хранилищ",
      run: () => e.openStorageFiles({
        id: "nashepo.projectfiles.picker",
        title: n,
        canPickMany: !0,
        allowLocal: !0,
        filters: y
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
  for (const s of t) {
    const r = Date.now();
    try {
      const c = T(await s.run()), o = Date.now() - r;
      if (c.length)
        return a.appendLine(`Выбор файлов: ${s.name}, выбрано ${c.length}`), c;
      if (o >= 400)
        return a.appendLine(`Выбор файлов отменён пользователем (${s.name}).`), [];
      a.appendLine(`Способ «${s.name}» не открыл окно (${o} мс), пробую следующий.`), i.push(`${s.name}: окно не открылось`);
    } catch (c) {
      const o = c?.message ?? String(c);
      a.appendLine(`Способ «${s.name}» завершился ошибкой: ${o}`), i.push(`${s.name}: ${o}`);
    }
  }
  return a.appendLine("Ни один способ выбора файлов не сработал."), a.show(), await e.showMessage(
    ["Не удалось открыть окно выбора файлов.", ...i],
    "error"
  ), [];
}
function M(e) {
  const n = /* @__PURE__ */ new Set(), a = [];
  for (const t of e) {
    const i = (t.origin ?? "") + "|" + p(t);
    n.has(i) || (n.add(i), a.push(t));
  }
  return a;
}
const _ = 18e4;
function m(e) {
  if (!e) return;
  const n = e.model;
  if (!(!n || typeof n != "object" || !("attachments" in n)))
    return n.project ?? n;
}
function L(e) {
  return m(e.app) ?? m(e.manager.activeApp);
}
function F(e) {
  if (!e) return "проект";
  const n = e.workspace?.root?.title;
  return n || (e.windows[0]?.title ?? "проект");
}
async function I(e, n = 12e4) {
  const a = Date.now() + n;
  for (; ; ) {
    const t = m(e);
    if (t) return t;
    if (Date.now() > a) return;
    await S(100);
  }
}
async function z(e, n) {
  const a = e.layers.itemByName(n);
  if (a) return a;
  try {
    return await e.layers.add({ name: n });
  } catch {
    return e.layers.layer0;
  }
}
function C(e, n, a) {
  return e.attachments.find((t) => t.uri === n || !!t.name && t.name === a);
}
async function k(e, n, a, t) {
  const i = [], s = [], r = e.beginProgress();
  r.indeterminate = !1, r.label = "Добавление файлов в проект";
  try {
    for (let o = 0; o < a.length; o++) {
      const l = a[o], d = p(l), w = v(l);
      r.details = d, r.percents = Math.round(o / a.length * 50);
      try {
        const u = await D(l);
        if (!u) {
          t.appendLine(`- ${d}: не удалось определить адрес файла`), i.push({ name: d, status: "failed", message: "нет адреса файла" });
          continue;
        }
        t.appendLine(`  ${d} -> ${u}`);
        const g = C(n, u, w);
        if (g) {
          t.appendLine(`= ${d}: уже подключён к проекту`), i.push({ name: d, status: "exists" }), g.state !== f.Loaded && s.push({ attachment: g, label: d });
          continue;
        }
        const P = await z(n, w), j = await n.attachments.add({ name: w, uri: u, layer: P });
        s.push({ attachment: j, label: d });
      } catch (u) {
        const g = u?.message ?? String(u);
        t.appendLine(`- ${d}: ${g}`), i.push({ name: d, status: "failed", message: g });
      }
    }
    r.label = "Загрузка вложений", r.details = `${s.length} шт.`, r.percents = 50;
    const c = await Promise.all(s.map((o) => H(o, t)));
    for (const o of c) {
      const l = i.find((d) => d.name === o.name && d.status === "exists");
      if (l) {
        o.status !== "added" && (l.status = o.status);
        continue;
      }
      i.push(o);
    }
    r.percents = 100;
  } finally {
    e.endProgress(r);
  }
  return i;
}
async function H(e, n) {
  const { attachment: a, label: t } = e;
  try {
    await N(a.show(), _);
  } catch (i) {
    const s = i?.message ?? String(i);
    return a.state === f.Loaded ? (n.appendLine(`+ ${t}: подключён`), { name: t, status: "added" }) : (n.appendLine(`- ${t}: ${s}`), { name: t, status: s === "timeout" ? "loading" : "failed", message: s });
  }
  return a.state === f.Error ? (n.appendLine(`- ${t}: загрузка завершилась ошибкой`), { name: t, status: "failed", message: "ошибка загрузки" }) : a.state === f.Loading ? (n.appendLine(`~ ${t}: загрузка продолжается`), { name: t, status: "loading" }) : (n.appendLine(`+ ${t}: подключён`), { name: t, status: "added" });
}
function N(e, n) {
  return new Promise((a, t) => {
    let i = !1;
    const s = setTimeout(() => {
      i || (i = !0, t(new Error("timeout")));
    }, n);
    e.then(
      (r) => {
        i || (i = !0, clearTimeout(s), a(r));
      },
      (r) => {
        i || (i = !0, clearTimeout(s), t(r));
      }
    );
  });
}
function O(e) {
  const n = e.filter((r) => r.status === "added").length, a = e.filter((r) => r.status === "exists").length, t = e.filter((r) => r.status === "loading").length, i = e.filter((r) => r.status === "failed"), s = [`Подключено файлов: ${n}`];
  return a && s.push(`уже было в проекте: ${a}`), t && s.push(`ещё загружается: ${t}`), i.length && s.push(`не удалось: ${i.length} (${i.map((r) => r.name).join(", ")})`), s.join(". ") + ".";
}
function S(e) {
  return new Promise((n) => setTimeout(n, e));
}
const A = "Создание проекта";
function $(e) {
  return e.createOutputChannel(A);
}
async function h(e, n, a) {
  const t = $(e);
  t.appendLine(`— ${n} —`);
  try {
    await a(t);
  } catch (i) {
    const s = i?.message ?? String(i);
    t.appendLine(`Ошибка: ${s}`);
    const r = i?.stack;
    r && t.appendLine(r), t.show(), await e.showMessage([`${n}: ${s}`, "Подробности в канале вывода «Создание проекта»."], "error");
  }
}
function U(e) {
  const n = $(e);
  return h(e, "Создание проекта", async () => {
    const a = M(await b(e, "Выберите файлы, которые нужно открыть в одном проекте", n));
    if (!a.length) return;
    n.appendLine(`Выбрано файлов: ${a.length}`);
    for (const r of a) n.appendLine(`  · ${p(r)}`);
    const t = e.manager.activeApp;
    let i = m(t), s = a;
    if (i) {
      const r = await e.showQuickPick(
        [
          { label: "Новый проект", description: `на основе файла «${p(a[0])}»`, value: "new" },
          { label: "Текущий проект", description: F(t), value: "current" }
        ],
        { title: "Создание проекта", placeHolder: "Куда добавить выбранные файлы" }
      );
      if (!r) {
        n.appendLine("Отменено пользователем.");
        return;
      }
      r.value === "new" && (i = void 0);
    }
    if (!i) {
      const r = a[0];
      n.appendLine(`Открываю проект: ${p(r)}`);
      const c = await e.manager.openWorkspace(r);
      if (i = await I(c), !i) {
        n.appendLine("Не удалось получить модель проекта. Формат первого файла не поддерживается как проект."), n.show(), await e.showMessage(
          `Файл «${p(r)}» не открылся как проект. Выберите первым файл проекта или откройте проект вручную.`,
          "error"
        );
        return;
      }
      s = a.slice(1);
    }
    if (!s.length) {
      n.appendLine("Дополнительных файлов нет."), await e.showMessage("Проект открыт. Дополнительных файлов для подключения не выбрано.", "info");
      return;
    }
    await E(e, n, await k(e, i, s, n));
  });
}
function R(e) {
  const n = $(e);
  return h(e, "Добавление файлов", async () => {
    const a = L(e);
    if (!a) {
      await e.showMessage("Нет открытого проекта. Используйте команду «Создать проект».", "warning");
      return;
    }
    const t = M(await b(e, "Выберите файлы для добавления в проект", n));
    t.length && (n.appendLine(`Добавление файлов в проект: ${t.length}`), await E(e, n, await k(e, a, t, n)));
  });
}
async function E(e, n, a) {
  const t = O(a);
  n.appendLine(t);
  const i = a.some((s) => s.status === "failed" || s.status === "loading");
  i && n.show(), await e.showMessage(t, i ? "warning" : "info");
}
function B(e) {
  return h(e, "Обновление вложений", async (n) => {
    const a = L(e);
    if (!a) {
      await e.showMessage("Нет открытого проекта.", "warning");
      return;
    }
    const t = [];
    if (a.attachments.forEach((c) => {
      t.push(c);
    }), !t.length) {
      await e.showMessage("В проекте нет вложений.", "info");
      return;
    }
    n.show(!0), n.appendLine(`Обновление вложений: ${t.length}`);
    let i = 0;
    const s = e.beginProgress();
    s.indeterminate = !1, s.label = "Обновление вложений";
    try {
      for (let c = 0; c < t.length; c++) {
        const o = t[c], l = o.name ?? o.uri ?? "вложение";
        s.details = l, s.percents = Math.round(c / t.length * 100);
        try {
          await o.show(), n.appendLine(`+ ${l}`);
        } catch (d) {
          i++, n.appendLine(`- ${l}: ${d?.message ?? String(d)}`);
        }
      }
      s.percents = 100;
    } finally {
      e.endProgress(s);
    }
    const r = i ? `Обновлено вложений: ${t.length - i}. Не удалось: ${i}.` : `Обновлено вложений: ${t.length}.`;
    n.appendLine(r), await e.showMessage(r, i ? "warning" : "info");
  });
}
function Q(e) {
  return h(e, "Состав проекта", async (n) => {
    n.show();
    const a = L(e);
    if (!a) {
      n.appendLine("Нет открытого проекта."), await e.showMessage("Нет открытого проекта.", "warning");
      return;
    }
    let t = 0;
    a.attachments.forEach((i) => {
      t++, n.appendLine(`${t}. ${i.name ?? "без имени"} — ${W(i.state)}`), i.uri && n.appendLine(`   ${i.uri}`);
    }), n.appendLine(t ? `Всего вложений: ${t}` : "Вложений нет.");
  });
}
function W(e) {
  switch (e) {
    case f.Loaded:
      return "загружено";
    case f.Loading:
      return "загружается";
    case f.Hidden:
      return "скрыто";
    case f.Error:
      return "ошибка загрузки";
    default:
      return "состояние неизвестно";
  }
}
const q = {
  create_project: U,
  add_files: R,
  reload_attachments: B,
  list_attachments: Q
};
export {
  q as default
};
