import {browserPreview} from "./app-mode";

let previewStore: ReturnType<typeof import("./browser-preview-store").createBrowserPreviewStore> | undefined;

export async function appFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!browserPreview) return fetch(path, init);
  init?.signal?.throwIfAborted();
  try {
    const {createBrowserPreviewStore, PREVIEW_STORAGE_KEY} = await import("./browser-preview-store");
    previewStore ??= createBrowserPreviewStore(window.localStorage);
    const execute = () => {init?.signal?.throwIfAborted(); return previewStore!.request(path, init?.method ?? "GET", typeof init?.body === "string" ? JSON.parse(init.body) : undefined);};
    return navigator.locks ? await navigator.locks.request(PREVIEW_STORAGE_KEY, execute) : await execute();
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    return Response.json({error: error instanceof SyntaxError ? "資料格式不正確" : "此瀏覽器目前無法保存試玩紀錄，請確認網站儲存權限後重試。"}, {status: error instanceof SyntaxError ? 400 : 503});
  }
}
