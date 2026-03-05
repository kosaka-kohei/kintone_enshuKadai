import { Page } from '@playwright/test';

/** kintoneのページ読み込み完了を待つ */
export async function waitForKintoneReady(page: Page) {
  await page.waitForFunction(() => typeof (window as any).kintone !== 'undefined');
  await page.waitForLoadState('networkidle');
}

/** kintone REST API呼び出しの完了を待つ */
export async function waitForKintoneApi(page: Page, endpoint: string) {
  return page.waitForResponse(
    response => response.url().includes(endpoint) && response.ok()
  );
}

/** カスタムビューに移動 */
export async function goToCustomView(page: Page, appId: string, viewId: string) {
  await page.goto(`/k/${appId}/?view=${viewId}`);
  await waitForKintoneReady(page);
}
