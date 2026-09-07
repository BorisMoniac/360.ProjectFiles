var p = /* @__PURE__ */ ((n) => (n[n.Hidden = 1] = "Hidden", n[n.Loading = 2] = "Loading", n[n.Loaded = 3] = "Loaded", n[n.Error = 4] = "Error", n))(p || {});
const y = [
  {
    name: "Модели и чертежи",
    extensions: ["smdx", "ifc", "ifcxml", "ifczip", "dwg", "dxf", "xml", "land", "gltf", "glb", "obj", "las", "laz", "txt", "csv"]
  },
  { name: "Топоматик 360 (*.smdx)", extensions: ["smdx"] },
  { name: "IFC (*.ifc, *.ifcxml, *.ifczip)", extensions: ["ifc", "ifcxml", "ifczip"] },
  { name: "Чертежи AutoCAD (*.dwg, *.dxf)", extensions: ["dwg", "dxf"] }
];
function m(n) {
  const e = n.root?.title;
  if (e) return e;
  const a = (n.origin ?? "").split(/[\/\\]/).pop() ?? "";
  return decodeURIComponent(a) || "Без имени";
}
function D(n) {
  const e = m(n), i = e.lastIndexOf(".");
  return i > 0 ? e.slice(0, i) : e;
}
async function z(n) {
  const e = { origin: n.origin };
  try {
    const i = await n.bookmark?.();
    i && (e.bookmark = i);
  } catch {
  }
  return e.uri = e.bookmark ?? e.origin, e;
}
function F(n) {
  return n ? (Array.isArray(n) ? n : [n]).filter((i) => !!i) : [];
}
async function M(n, e, i) {
  const a = [
    {
      name: "диалог открытия",
      run: () => n.openDialog({ multiSelections: !0, buttonLabel: "Выбрать", message: e, filters: y })
    },
    {
      name: "обозреватель хранилищ",
      run: () => n.openStorageFiles({
        id: "nashepo.projectfiles.picker",
        title: e,
        canPickMany: !0,
        allowLocal: !0,
        filters: y
      })
    },
    {
      name: "диалог открытия без фильтров",
      run: () => n.openDialog({ multiSelections: !0 })
    },
    {
      name: "диалог открытия по одному файлу",
      run: () => n.openDialog({ buttonLabel: "Выбрать" })
    }
  ], r = [];
  for (const s of a) {
    const t = Date.now();
    try {
      const c = F(await s.run()), o = Date.now() - t;
      if (c.length)
        return i.appendLine(`Выбор файлов: ${s.name}, выбрано ${c.length}`), c;
      if (o >= 400)
        return i.appendLine(`Выбор файлов отменён пользователем (${s.name}).`), [];
      i.appendLine(`Способ «${s.name}» не открыл окно (${o} мс), пробую следующий.`), r.push(`${s.name}: окно не открылось`);
    } catch (c) {
      const o = c?.message ?? String(c);
      i.appendLine(`Способ «${s.name}» завершился ошибкой: ${o}`), r.push(`${s.name}: ${o}`);
    }
  }
  return i.appendLine("Ни один способ выбора файлов не сработал."), i.show(), await n.showMessage(
    ["Не удалось открыть окно выбора файлов.", ...r],
    "error"
  ), [];
}
function E(n) {
  const e = /* @__PURE__ */ new Set(), i = [];
  for (const a of n) {
    const r = (a.origin ?? "") + "|" + m(a);
    e.has(r) || (e.add(r), i.push(a));
  }
  return i;
}
const I = 18e4;
function w(n) {
  if (!n) return;
  const e = n.model;
  if (!(!e || typeof e != "object" || !("attachments" in e)))
    return e.project ?? e;
}
function L(n) {
  return w(n.app) ?? w(n.manager.activeApp);
}
function O(n) {
  if (!n) return "проект";
  const e = n.workspace?.root?.title;
  return e || (n.windows[0]?.title ?? "проект");
}
async function S(n, e = 12e4) {
  const i = Date.now() + e;
  for (; ; ) {
    const a = w(n);
    if (a) return a;
    if (Date.now() > i) return;
    await R(100);
  }
}
async function _(n, e) {
  const i = n.layers.itemByName(e);
  if (i) return i;
  try {
    return await n.layers.add({ name: e });
  } catch {
    return n.layers.layer0;
  }
}
function A(n, e, i) {
  return n.attachments.find((a) => a.uri === e || !!a.name && a.name === i);
}
async function j(n, e, i, a) {
  const r = [], s = [], t = n.beginProgress();
  t.indeterminate = !1, t.label = "Добавление файлов в проект";
  try {
    for (let o = 0; o < i.length; o++) {
      const l = i[o], d = m(l), $ = D(l);
      t.details = d, t.percents = Math.round(o / i.length * 50);
      try {
        const g = await z(l);
        a.appendLine(`  ${d}`), a.appendLine(`     origin:   ${g.origin ?? "нет"}`), a.appendLine(`     bookmark: ${g.bookmark ?? "нет"}`);
        const f = g.uri;
        if (!f) {
          a.appendLine(`- ${d}: не удалось определить адрес файла`), r.push({ name: d, status: "failed", message: "нет адреса файла" });
          continue;
        }
        a.appendLine(`     выбран:   ${f}`);
        const u = A(e, f, $);
        if (u) {
          a.appendLine(`= ${d}: уже подключён к проекту`), r.push({ name: d, status: "exists" }), u.state !== p.Loaded && s.push({ attachment: u, label: d });
          continue;
        }
        const P = await _(e, $), T = await e.attachments.add({ name: $, uri: f, layer: P });
        s.push({ attachment: T, label: d });
      } catch (g) {
        const f = g?.message ?? String(g);
        a.appendLine(`- ${d}: ${f}`), r.push({ name: d, status: "failed", message: f });
      }
    }
    t.label = "Загрузка вложений", t.details = `${s.length} шт.`, t.percents = 50;
    const c = await Promise.all(s.map((o) => H(o, a)));
    for (const o of c) {
      const l = r.find((d) => d.name === o.name && d.status === "exists");
      if (l) {
        o.status !== "added" && (l.status = o.status);
        continue;
      }
      r.push(o);
    }
    t.percents = 100;
  } finally {
    n.endProgress(t);
  }
  return r;
}
async function H(n, e) {
  const { attachment: i, label: a } = n;
  try {
    await N(i.show(), I);
  } catch (r) {
    const s = r?.message ?? String(r);
    return i.state === p.Loaded ? (e.appendLine(`+ ${a}: подключён`), { name: a, status: "added" }) : (e.appendLine(`- ${a}: ${s}`), { name: a, status: s === "timeout" ? "loading" : "failed", message: s });
  }
  return i.state === p.Error ? (e.appendLine(`- ${a}: загрузка завершилась ошибкой`), { name: a, status: "failed", message: "ошибка загрузки" }) : i.state === p.Loading ? (e.appendLine(`~ ${a}: загрузка продолжается`), { name: a, status: "loading" }) : (e.appendLine(`+ ${a}: подключён`), { name: a, status: "added" });
}
function N(n, e) {
  return new Promise((i, a) => {
    let r = !1;
    const s = setTimeout(() => {
      r || (r = !0, a(new Error("timeout")));
    }, e);
    n.then(
      (t) => {
        r || (r = !0, clearTimeout(s), i(t));
      },
      (t) => {
        r || (r = !0, clearTimeout(s), a(t));
      }
    );
  });
}
function C(n) {
  const e = n.filter((t) => t.status === "added").length, i = n.filter((t) => t.status === "exists").length, a = n.filter((t) => t.status === "loading").length, r = n.filter((t) => t.status === "failed"), s = [`Подключено файлов: ${e}`];
  return i && s.push(`уже было в проекте: ${i}`), a && s.push(`ещё загружается: ${a}`), r.length && s.push(`не удалось: ${r.length} (${r.map((t) => t.name).join(", ")})`), s.join(". ") + ".";
}
function R(n) {
  return new Promise((e) => setTimeout(e, n));
}
const k = "-".repeat(56);
async function U(n, e) {
  e.clear(), e.show(), e.appendLine("ДИАГНОСТИКА НашеПО · Создание проекта"), e.appendLine(k), W(n, e), B(n, e), Q(n, e), q(n, e), await G(n, e), e.appendLine(k), e.appendLine("Отчёт готов. Скопируйте его целиком.");
}
function W(n, e) {
  e.appendLine("1. Активное приложение");
  const i = n.manager.activeApp;
  if (!i) {
    e.appendLine("   приложение не открыто");
    return;
  }
  e.appendLine(`   tag: ${i.tag}`), e.appendLine(`   окон: ${i.windows.length}`);
  const a = i.workspace;
  e.appendLine(`   workspace.origin: ${a?.origin ?? "нет"}`), e.appendLine(`   workspace.root.title: ${a?.root?.title ?? "нет"}`), e.appendLine(`   workspace.inmemory: ${a?.inmemory}`), e.appendLine(`   модель проекта найдена: ${L(n) ? "да" : "нет"}`);
}
function B(n, e) {
  e.appendLine("2. Вложения проекта");
  const i = L(n);
  if (!i) {
    e.appendLine("   проект не открыт");
    return;
  }
  let a = 0;
  i.attachments.forEach((r) => {
    a++, e.appendLine(`   ${a}. ${r.name ?? "без имени"} | ${J(r.state)}`), e.appendLine(`      uri:   ${r.uri ?? "нет"}`), e.appendLine(`      etag:  ${r.etag ?? "нет"}`), e.appendLine(`      sha1:  ${r.sha1 ?? "нет"}`), e.appendLine(`      слой:  ${r.layer?.name ?? "нет"}`);
  }), a || e.appendLine("   вложений нет");
}
function Q(n, e) {
  e.appendLine("3. История открытых файлов");
  const i = n.manager.mruWorkspaces?.items ?? [];
  if (!i.length) {
    e.appendLine("   история пуста");
    return;
  }
  for (const a of i.slice(0, 15))
    e.appendLine(`   ${a.title}`), e.appendLine(`      ${a.uri}`);
}
function q(n, e) {
  e.appendLine("4. Расширения и действия");
  for (const i of n.manager.extensions) {
    const a = i.manifest?.name ?? "без имени", r = Object.keys(i.actions ?? {});
    e.appendLine(`   ${a} (${i.manifest?.version ?? "без версии"}), действий: ${r.length}`);
    for (const s of r) {
      const t = i.actions[s];
      e.appendLine(`      ${s} | ${t?.label ?? ""} | cmd: ${t?.cmd ?? ""}`);
    }
  }
}
async function G(n, e) {
  e.appendLine("5. Проба файла"), e.appendLine("   Сейчас откроется выбор файла. Выберите любой файл модели.");
  let i;
  try {
    i = await n.openDialog({ buttonLabel: "Проверить", filters: y });
  } catch (a) {
    e.appendLine(`   диалог не открылся: ${a?.message ?? String(a)}`);
    return;
  }
  if (!i) {
    e.appendLine("   выбор отменён");
    return;
  }
  if (e.appendLine(`   root.title:    ${i.root?.title}`), e.appendLine(`   root.mimeType: ${i.root?.mimeType}`), e.appendLine(`   root.size:     ${i.root?.size}`), e.appendLine(`   root.id:       ${i.root?.id ?? "нет"}`), e.appendLine(`   origin:        ${i.origin ?? "нет"}`), e.appendLine(`   inmemory:      ${i.inmemory}`), e.appendLine(`   есть bookmark: ${typeof i.bookmark == "function" ? "да" : "нет"}`), typeof i.bookmark == "function")
    try {
      const a = await i.bookmark();
      e.appendLine(`   bookmark():    ${a ?? "undefined"}`);
    } catch (a) {
      e.appendLine(`   bookmark() ошибка: ${a?.message ?? String(a)}`);
    }
  try {
    const a = await i.root.get();
    e.appendLine(`   чтение файла:  ${a?.byteLength ?? 0} байт`);
  } catch (a) {
    e.appendLine(`   чтение файла ошибка: ${a?.message ?? String(a)}`);
  }
}
function J(n) {
  switch (n) {
    case p.Loaded:
      return "загружено";
    case p.Loading:
      return "загружается";
    case p.Hidden:
      return "скрыто";
    case p.Error:
      return "ошибка загрузки";
    default:
      return "состояние неизвестно";
  }
}
const K = "Создание проекта";
function b(n) {
  return n.createOutputChannel(K);
}
async function h(n, e, i) {
  const a = b(n);
  a.appendLine(`— ${e} —`);
  try {
    await i(a);
  } catch (r) {
    const s = r?.message ?? String(r);
    a.appendLine(`Ошибка: ${s}`);
    const t = r?.stack;
    t && a.appendLine(t), a.show(), await n.showMessage([`${e}: ${s}`, "Подробности в канале вывода «Создание проекта»."], "error");
  }
}
function V(n) {
  const e = b(n);
  return h(n, "Создание проекта", async () => {
    const i = E(await M(n, "Выберите файлы, которые нужно открыть в одном проекте", e));
    if (!i.length) return;
    e.appendLine(`Выбрано файлов: ${i.length}`);
    for (const t of i) e.appendLine(`  · ${m(t)}`);
    const a = n.manager.activeApp;
    let r = w(a), s = i;
    if (r) {
      const t = await n.showQuickPick(
        [
          { label: "Новый проект", description: `на основе файла «${m(i[0])}»`, value: "new" },
          { label: "Текущий проект", description: O(a), value: "current" }
        ],
        { title: "Создание проекта", placeHolder: "Куда добавить выбранные файлы" }
      );
      if (!t) {
        e.appendLine("Отменено пользователем.");
        return;
      }
      t.value === "new" && (r = void 0);
    }
    if (!r) {
      const t = i[0];
      e.appendLine(`Открываю проект: ${m(t)}`);
      const c = await n.manager.openWorkspace(t);
      if (r = await S(c), !r) {
        e.appendLine("Не удалось получить модель проекта. Формат первого файла не поддерживается как проект."), e.show(), await n.showMessage(
          `Файл «${m(t)}» не открылся как проект. Выберите первым файл проекта или откройте проект вручную.`,
          "error"
        );
        return;
      }
      s = i.slice(1);
    }
    if (!s.length) {
      e.appendLine("Дополнительных файлов нет."), await n.showMessage("Проект открыт. Дополнительных файлов для подключения не выбрано.", "info");
      return;
    }
    await v(n, e, await j(n, r, s, e));
  });
}
function X(n) {
  const e = b(n);
  return h(n, "Добавление файлов", async () => {
    const i = L(n);
    if (!i) {
      await n.showMessage("Нет открытого проекта. Используйте команду «Создать проект».", "warning");
      return;
    }
    const a = E(await M(n, "Выберите файлы для добавления в проект", e));
    a.length && (e.appendLine(`Добавление файлов в проект: ${a.length}`), await v(n, e, await j(n, i, a, e)));
  });
}
async function v(n, e, i) {
  const a = C(i);
  e.appendLine(a);
  const r = i.some((s) => s.status === "failed" || s.status === "loading");
  r && e.show(), await n.showMessage(a, r ? "warning" : "info");
}
function Y(n) {
  return h(n, "Обновление вложений", async (e) => {
    const i = L(n);
    if (!i) {
      await n.showMessage("Нет открытого проекта.", "warning");
      return;
    }
    const a = [];
    if (i.attachments.forEach((c) => {
      a.push(c);
    }), !a.length) {
      await n.showMessage("В проекте нет вложений.", "info");
      return;
    }
    e.show(!0), e.appendLine(`Обновление вложений: ${a.length}`);
    let r = 0;
    const s = n.beginProgress();
    s.indeterminate = !1, s.label = "Обновление вложений";
    try {
      for (let c = 0; c < a.length; c++) {
        const o = a[c], l = o.name ?? o.uri ?? "вложение";
        s.details = l, s.percents = Math.round(c / a.length * 100);
        try {
          await o.show(), e.appendLine(`+ ${l}`);
        } catch (d) {
          r++, e.appendLine(`- ${l}: ${d?.message ?? String(d)}`);
        }
      }
      s.percents = 100;
    } finally {
      n.endProgress(s);
    }
    const t = r ? `Обновлено вложений: ${a.length - r}. Не удалось: ${r}.` : `Обновлено вложений: ${a.length}.`;
    e.appendLine(t), await n.showMessage(t, r ? "warning" : "info");
  });
}
function Z(n) {
  return h(n, "Состав проекта", async (e) => {
    e.show();
    const i = L(n);
    if (!i) {
      e.appendLine("Нет открытого проекта."), await n.showMessage("Нет открытого проекта.", "warning");
      return;
    }
    let a = 0;
    i.attachments.forEach((r) => {
      a++, e.appendLine(`${a}. ${r.name ?? "без имени"} — ${x(r.state)}`), r.uri && e.appendLine(`   ${r.uri}`);
    }), e.appendLine(a ? `Всего вложений: ${a}` : "Вложений нет.");
  });
}
function x(n) {
  switch (n) {
    case p.Loaded:
      return "загружено";
    case p.Loading:
      return "загружается";
    case p.Hidden:
      return "скрыто";
    case p.Error:
      return "ошибка загрузки";
    default:
      return "состояние неизвестно";
  }
}
function ee(n) {
  return h(n, "Диагностика", (e) => U(n, e));
}
const ne = {
  create_project: V,
  add_files: X,
  reload_attachments: Y,
  list_attachments: Z,
  diagnose: ee
};
export {
  ne as default
};
