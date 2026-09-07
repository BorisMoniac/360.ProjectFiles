/**
 * Работа с проектом: поиск главного чертежа и подключение файлов.
 *
 * Файл подключается не ссылкой на путь, а штатной командой платформы
 * ru.albatros.wdx/attachment:add:workspace. Она импортирует содержимое файла
 * внутрь проекта, заводит слой с именем файла и создаёт вложение с хешем
 * содержимого. Именно так работает пункт «Добавить файл» в дереве проекта.
 * Ссылка по адресу файла для выбранных в диалоге файлов не работает: их адрес
 * имеет вид file://handle/имя и загрузчику вложений не подходит.
 */
import { fileName } from './files';

/** Штатная команда платформы, подключающая рабочую область к проекту. */
const ADD_WORKSPACE = 'ru.albatros.wdx/attachment:add:workspace';

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

/**
 * Сделать активным вид нужного проекта и дождаться его готовности.
 *
 * Команда подключения работает с активным видом чертежа: если вида нет,
 * она молча отменяет операцию. Поэтому после открытия проекта нужно дождаться,
 * пока его окно появится и получит составной слой.
 */
export async function activateView(ctx: Context, app: Application, timeoutMs = 60000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const window = app.windows.find(w => (w as CadViewDocumentWindow).context !== undefined) as
      CadViewDocumentWindow | undefined;
    if (window) {
      ctx.manager.activeWindow = window;
      if (window.context?.layer) return true;
    }
    if (Date.now() > deadline) return false;
    await delay(100);
  }
}

/** Уже подключённое вложение с таким именем. */
function alreadyAttached(project: Drawing, name: string): boolean {
  return !!project.attachments.find(att => att.name === name);
}

/**
 * Подключить набор файлов к проекту.
 * Файлы обрабатываются по очереди: платформа импортирует их в общий вид,
 * и параллельный запуск здесь только мешает.
 */
export async function attachAll(
  ctx: Context,
  project: Drawing,
  items: Workspace[],
  output: OutputChannel
): Promise<AttachResult[]> {
  const results: AttachResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const ws = items[i];
    const label = fileName(ws);

    if (alreadyAttached(project, label)) {
      output.appendLine(`= ${label}: уже подключён к проекту`);
      results.push({name: label, status: 'exists'});
      continue;
    }

    try {
      output.appendLine(`… ${label}: подключаю (${i + 1} из ${items.length})`);
      await ctx.manager.eval(ADD_WORKSPACE, {workspace: ws});
      output.appendLine(`+ ${label}: подключён`);
      results.push({name: label, status: 'added'});
    } catch (e) {
      const message = describe(e, label);
      output.appendLine(`- ${label}: ${message}`);
      results.push({name: label, status: 'failed', message});
    }
  }

  return results;
}

/**
 * Пояснить отказ команды подключения.
 * Платформа отменяет операцию без текста, если формат файла не поддерживается
 * ни одним импортёром или если нет активного вида проекта.
 */
function describe(e: unknown, label: string): string {
  const message = (e as Error)?.message;
  if (message) return message;
  const dot = label.lastIndexOf('.');
  const ext = dot > 0 ? label.slice(dot) : '';
  return ext
    ? `платформа отклонила файл. Проверьте, что формат ${ext} поддерживается импортёром и открыт вид проекта`
    : 'платформа отклонила файл';
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
