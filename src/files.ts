/**
 * Выбор файлов и разбор их имён.
 */

/** Фильтры диалога открытия. Первый фильтр применяется по умолчанию. */
export const FILE_FILTERS: FileFilter[] = [
  {
    name: 'Модели и чертежи',
    extensions: ['smdx', 'ifc', 'ifcxml', 'ifczip', 'dwg', 'dxf', 'xml', 'land', 'gltf', 'glb', 'obj', 'las', 'laz', 'txt', 'csv']
  },
  {name: 'Топоматик 360 (*.smdx)', extensions: ['smdx']},
  {name: 'IFC (*.ifc, *.ifcxml, *.ifczip)', extensions: ['ifc', 'ifcxml', 'ifczip']},
  {name: 'Чертежи AutoCAD (*.dwg, *.dxf)', extensions: ['dwg', 'dxf']}
];

/**
 * В веб-версии окно выбора файлов строится браузером, и он отклоняет фильтр
 * с маской «*». Поэтому в списке нет пункта «Все файлы»: браузер добавляет
 * такой пункт сам, а в настольной версии выручает попытка без фильтров.
 */

/** Заголовок рабочей области, то есть имя файла с расширением. */
export function fileName(ws: Workspace): string {
  const title = ws.root?.title;
  if (title) return title;
  const origin = ws.origin ?? '';
  const tail = origin.split(/[\/\\]/).pop() ?? '';
  return decodeURIComponent(tail) || 'Без имени';
}

/** Имя файла без расширения. Используется как имя вложения и слоя. */
export function baseName(ws: Workspace): string {
  const name = fileName(ws);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

/**
 * Постоянный адрес рабочей области для записи во вложение.
 * Закладка переживает перезапуск программы, поэтому она в приоритете над origin.
 */
export async function permanentUri(ws: Workspace): Promise<string | undefined> {
  try {
    const bookmark = await ws.bookmark?.();
    if (bookmark) return bookmark;
  } catch {
    // Хранилище не умеет делать закладки, остаётся исходный адрес.
  }
  return ws.origin;
}

/** Привести результат диалога к массиву рабочих областей. */
function toList(value: unknown): Workspace[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.filter(item => !!item) as Workspace[];
}

/** Один способ выбора файлов. */
interface PickAttempt {
  name: string;
  run: () => Promise<unknown>;
}

/**
 * Показать диалог выбора файлов.
 *
 * Способы перебираются по очереди. Следующий способ пробуется, если предыдущий
 * бросил ошибку или завершился мгновенно и без результата, то есть окно не открылось.
 * Если окно открылось и пользователь отменил выбор, возвращается пустой массив
 * и перебор прекращается.
 */
export async function pickFiles(ctx: Context, message: string, output: OutputChannel): Promise<Workspace[]> {
  const attempts: PickAttempt[] = [
    {
      name: 'диалог открытия',
      run: () => ctx.openDialog({multiSelections: true, buttonLabel: 'Выбрать', message, filters: FILE_FILTERS})
    },
    {
      name: 'обозреватель хранилищ',
      run: () => ctx.openStorageFiles({
        id: 'nashepo.projectfiles.picker',
        title: message,
        canPickMany: true,
        allowLocal: true,
        filters: FILE_FILTERS
      })
    },
    {
      name: 'диалог открытия без фильтров',
      run: () => ctx.openDialog({multiSelections: true})
    },
    {
      name: 'диалог открытия по одному файлу',
      run: () => ctx.openDialog({buttonLabel: 'Выбрать'})
    }
  ];

  const problems: string[] = [];

  for (const attempt of attempts) {
    const started = Date.now();
    try {
      const items = toList(await attempt.run());
      const elapsed = Date.now() - started;
      if (items.length) {
        output.appendLine(`Выбор файлов: ${attempt.name}, выбрано ${items.length}`);
        return items;
      }
      if (elapsed >= 400) {
        output.appendLine(`Выбор файлов отменён пользователем (${attempt.name}).`);
        return [];
      }
      output.appendLine(`Способ «${attempt.name}» не открыл окно (${elapsed} мс), пробую следующий.`);
      problems.push(`${attempt.name}: окно не открылось`);
    } catch (e) {
      const text = (e as Error)?.message ?? String(e);
      output.appendLine(`Способ «${attempt.name}» завершился ошибкой: ${text}`);
      problems.push(`${attempt.name}: ${text}`);
    }
  }

  output.appendLine('Ни один способ выбора файлов не сработал.');
  output.show();
  await ctx.showMessage(
    ['Не удалось открыть окно выбора файлов.', ...problems],
    'error'
  );
  return [];
}

/** Убрать повторы по имени файла и по адресу. */
export function distinct(items: Workspace[]): Workspace[] {
  const seen = new Set<string>();
  const result: Workspace[] = [];
  for (const ws of items) {
    const key = (ws.origin ?? '') + '|' + fileName(ws);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(ws);
  }
  return result;
}
