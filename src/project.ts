/**
 * Работа с проектом: поиск главного чертежа и подключение файлов как вложений.
 */
import { AttachmentState } from 'albatros/enums';
import { baseName, fileName, permanentUri } from './files';

/** Сколько ждать загрузки одного вложения, прежде чем считать её незавершённой. */
const LOAD_TIMEOUT_MS = 180000;

/** Результат подключения одного файла. */
export interface AttachResult {
  name: string;
  status: 'added' | 'exists' | 'loading' | 'failed';
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

/** Уже подключённое вложение с таким же адресом или именем. */
function findAttachment(project: Drawing, uri: string, name: string): DwgAttachment | undefined {
  return project.attachments.find(att => att.uri === uri || (!!att.name && att.name === name));
}

/** Подготовленное к загрузке вложение. */
interface Pending {
  attachment: DwgAttachment;
  label: string;
}

/**
 * Подключить набор файлов.
 *
 * Сначала все вложения добавляются в проект, и только потом запускается их
 * загрузка, причём параллельно. Последовательное ожидание каждой загрузки
 * приводило к тому, что вложения зависали в состоянии «загрузка».
 */
export async function attachAll(
  ctx: Context,
  project: Drawing,
  items: Workspace[],
  output: OutputChannel
): Promise<AttachResult[]> {
  const results: AttachResult[] = [];
  const pending: Pending[] = [];

  const progress = ctx.beginProgress();
  progress.indeterminate = false;
  progress.label = 'Добавление файлов в проект';
  try {
    for (let i = 0; i < items.length; i++) {
      const ws = items[i];
      const label = fileName(ws);
      const name = baseName(ws);
      progress.details = label;
      progress.percents = Math.round((i / items.length) * 50);
      try {
        const uri = await permanentUri(ws);
        if (!uri) {
          output.appendLine(`- ${label}: не удалось определить адрес файла`);
          results.push({name: label, status: 'failed', message: 'нет адреса файла'});
          continue;
        }
        output.appendLine(`  ${label} -> ${uri}`);

        const duplicate = findAttachment(project, uri, name);
        if (duplicate) {
          output.appendLine(`= ${label}: уже подключён к проекту`);
          results.push({name: label, status: 'exists'});
          if (duplicate.state !== AttachmentState.Loaded) pending.push({attachment: duplicate, label});
          continue;
        }

        const layer = await ensureLayer(project, name);
        const attachment = await project.attachments.add({name, uri, layer});
        pending.push({attachment, label});
      } catch (e) {
        const message = (e as Error)?.message ?? String(e);
        output.appendLine(`- ${label}: ${message}`);
        results.push({name: label, status: 'failed', message});
      }
    }

    progress.label = 'Загрузка вложений';
    progress.details = `${pending.length} шт.`;
    progress.percents = 50;

    const loaded = await Promise.all(pending.map(item => load(item, output)));
    for (const item of loaded) {
      const existing = results.find(r => r.name === item.name && r.status === 'exists');
      if (existing) {
        if (item.status !== 'added') existing.status = item.status;
        continue;
      }
      results.push(item);
    }
    progress.percents = 100;
  } finally {
    ctx.endProgress(progress);
  }

  return results;
}

/** Загрузить одно вложение, не позволяя ожиданию длиться бесконечно. */
async function load(item: Pending, output: OutputChannel): Promise<AttachResult> {
  const {attachment, label} = item;
  try {
    await withTimeout(attachment.show(), LOAD_TIMEOUT_MS);
  } catch (e) {
    const message = (e as Error)?.message ?? String(e);
    if (attachment.state === AttachmentState.Loaded) {
      output.appendLine(`+ ${label}: подключён`);
      return {name: label, status: 'added'};
    }
    output.appendLine(`- ${label}: ${message}`);
    return {name: label, status: message === 'timeout' ? 'loading' : 'failed', message};
  }

  if (attachment.state === AttachmentState.Error) {
    output.appendLine(`- ${label}: загрузка завершилась ошибкой`);
    return {name: label, status: 'failed', message: 'ошибка загрузки'};
  }
  if (attachment.state === AttachmentState.Loading) {
    output.appendLine(`~ ${label}: загрузка продолжается`);
    return {name: label, status: 'loading'};
  }

  output.appendLine(`+ ${label}: подключён`);
  return {name: label, status: 'added'};
}

/** Ограничить ожидание обещания. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise<T | undefined>((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error('timeout'));
    }, ms);
    promise.then(
      value => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** Короткая сводка по результатам. */
export function summarize(results: AttachResult[]): string {
  const added = results.filter(r => r.status === 'added').length;
  const exists = results.filter(r => r.status === 'exists').length;
  const loading = results.filter(r => r.status === 'loading').length;
  const failed = results.filter(r => r.status === 'failed');
  const parts: string[] = [`Подключено файлов: ${added}`];
  if (exists) parts.push(`уже было в проекте: ${exists}`);
  if (loading) parts.push(`ещё загружается: ${loading}`);
  if (failed.length) parts.push(`не удалось: ${failed.length} (${failed.map(r => r.name).join(', ')})`);
  return parts.join('. ') + '.';
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
