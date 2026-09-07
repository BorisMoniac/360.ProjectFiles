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
  {name: 'Чертежи AutoCAD (*.dwg, *.dxf)', extensions: ['dwg', 'dxf']},
  {name: 'Все файлы', extensions: ['*']}
];

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

/** Показать диалог выбора файлов. Пустой массив означает отмену. */
export async function pickFiles(ctx: Context, message: string): Promise<Workspace[]> {
  const picked = await ctx.openDialog({
    multiSelections: true,
    buttonLabel: 'Выбрать',
    message,
    filters: FILE_FILTERS
  });
  if (!picked) return [];
  const list = Array.isArray(picked) ? picked : [picked];
  return list.filter(ws => !!ws);
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
