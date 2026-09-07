/**
 * Работа с проектом: поиск главного чертежа и подключение файлов как вложений.
 */
import { AttachmentState } from 'albatros/enums';
import { baseName, fileName, permanentUri } from './files';

/** Результат подключения одного файла. */
export interface AttachResult {
  name: string;
  status: 'added' | 'exists' | 'failed';
  message?: string;
}

/** Главный чертёж приложения. Undefined, если приложение не является проектом чертежа. */
export function projectOf(app: Application | undefined): Drawing | undefined {
  if (!app) return undefined;
  const model = app.model as Drawing | undefined;
  if (!model || typeof model !== 'object' || !('attachments' in model)) return undefined;
  return model.project ?? model;
}

/** Главный чертёж активного приложения. */
export function activeProject(ctx: Context): Drawing | undefined {
  return projectOf(ctx.app) ?? projectOf(ctx.manager.activeApp);
}

/** Название проекта для сообщений пользователю. */
export function projectTitle(app: Application | undefined): string {
  if (!app) return 'проект';
  const title = app.workspace?.root?.title;
  if (title) return title;
  return app.windows[0]?.title ?? 'проект';
}

/** Дождаться, пока модель приложения станет доступна. */
export async function waitForProject(app: Application, timeoutMs = 120000): Promise<Drawing | undefined> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const drawing = projectOf(app);
    if (drawing) return drawing;
    if (Date.now() > deadline) return undefined;
    await delay(100);
  }
}

/** Слой с указанным именем. Создаётся, если его ещё нет. */
async function ensureLayer(project: Drawing, name: string): Promise<DwgLayer | undefined> {
  const existing = project.layers.itemByName(name);
  if (existing) return existing;
  try {
    return await project.layers.add({name});
  } catch {
    return project.layers.layer0;
  }
}

/** Уже подключённое вложение с таким же адресом. */
function findAttachment(project: Drawing, uri: string, name: string): DwgAttachment | undefined {
  return project.attachments.find(att => att.uri === uri || (!!att.name && att.name === name));
}

/**
 * Подключить файл к проекту как вложение и загрузить его.
 * Ошибка одного файла не прерывает обработку остальных.
 */
export async function attachFile(project: Drawing, ws: Workspace, output: OutputChannel): Promise<AttachResult> {
  const name = baseName(ws);
  const label = fileName(ws);
  try {
    const uri = await permanentUri(ws);
    if (!uri) {
      output.appendLine(`✗ ${label}: не удалось определить адрес файла`);
      return {name: label, status: 'failed', message: 'нет адреса файла'};
    }

    const duplicate = findAttachment(project, uri, name);
    if (duplicate) {
      output.appendLine(`= ${label}: уже подключён к проекту`);
      if (duplicate.state !== AttachmentState.Loaded) await duplicate.show();
      return {name: label, status: 'exists'};
    }

    const layer = await ensureLayer(project, name);
    const attachment = await project.attachments.add({name, uri, layer});
    await attachment.show();

    if (attachment.state === AttachmentState.Error) {
      output.appendLine(`✗ ${label}: загрузка завершилась ошибкой`);
      return {name: label, status: 'failed', message: 'ошибка загрузки'};
    }

    output.appendLine(`+ ${label}: подключён`);
    return {name: label, status: 'added'};
  } catch (e) {
    const message = (e as Error)?.message ?? String(e);
    output.appendLine(`✗ ${label}: ${message}`);
    return {name: label, status: 'failed', message};
  }
}

/** Подключить набор файлов, показывая прогресс. */
export async function attachAll(
  ctx: Context,
  project: Drawing,
  items: Workspace[],
  output: OutputChannel
): Promise<AttachResult[]> {
  const results: AttachResult[] = [];
  const progress = ctx.beginProgress();
  progress.indeterminate = false;
  progress.label = 'Подключение файлов к проекту';
  try {
    for (let i = 0; i < items.length; i++) {
      progress.details = fileName(items[i]);
      progress.percents = Math.round((i / items.length) * 100);
      results.push(await attachFile(project, items[i], output));
    }
    progress.percents = 100;
  } finally {
    ctx.endProgress(progress);
  }
  return results;
}

/** Короткая сводка по результатам. */
export function summarize(results: AttachResult[]): string {
  const added = results.filter(r => r.status === 'added').length;
  const exists = results.filter(r => r.status === 'exists').length;
  const failed = results.filter(r => r.status === 'failed');
  const parts: string[] = [`Подключено файлов: ${added}`];
  if (exists) parts.push(`уже было в проекте: ${exists}`);
  if (failed.length) parts.push(`не удалось: ${failed.length} (${failed.map(r => r.name).join(', ')})`);
  return parts.join('. ') + '.';
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
