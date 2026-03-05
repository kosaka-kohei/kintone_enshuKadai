import { test, expect } from '@playwright/test';
import { goToCustomView, waitForKintoneReady } from './helpers/kintone-helpers';

// 日報アプリ: アプリID 7, カスタムビュー viewId 5978648
const APP_ID = '7';
const VIEW_ID = '5978648';

test.describe('日報検索 - 担当者選択で検索', () => {

  test.beforeEach(async ({ page }) => {
    // カスタムビューに移動し、KUCコンポーネントの描画完了を待つ
    await goToCustomView(page, APP_ID, VIEW_ID);
    await page.waitForSelector('kuc-dropdown', { state: 'attached', timeout: 15000 });
  });

  test('カスタムビューに検索フォームが表示される', async ({ page }) => {
    // 担当者ドロップダウンが表示されること
    await expect(page.locator('#dropdown kuc-dropdown')).toBeVisible();

    // 作業開始日・作業終了日のDatePickerが表示されること
    await expect(page.locator('#fromData kuc-date-picker')).toBeVisible();
    await expect(page.locator('#toData kuc-date-picker')).toBeVisible();

    // カテゴリチェックボックスが表示されること
    await expect(page.locator('#category kuc-checkbox')).toBeVisible();

    // 検索ボタン（一括更新）が表示されること
    await expect(page.locator('#Button kuc-button')).toBeVisible();

    // クリアボタンが表示されること
    await expect(page.locator('#ClearButton kuc-button')).toBeVisible();
  });

  test('担当者を選択して検索すると結果テーブルが表示される', async ({ page }) => {
    // KUC Dropdownから担当者を選択する
    // kuc-dropdownはShadow DOMを使用しているため、内部のselectを操作する
    const dropdown = page.locator('#dropdown kuc-dropdown');

    // ドロップダウンをクリックして開く
    await dropdown.click();

    // 最初の「-----」以外の選択肢をクリック（2番目の項目 = 最初の実ユーザー）
    // KUC Dropdownのリスト項目はShadow DOM内の .kuc-dropdown__select-menu__item
    const menuItems = dropdown.locator('.kuc-dropdown__select-menu__item');
    // 0番目は「-----」なので1番目（最初の担当者）を選択
    await menuItems.nth(1).click();

    // 検索ボタン（テキスト「一括更新」）をクリック
    const searchButton = page.locator('#Button kuc-button');
    await searchButton.click();

    // kintone REST API の応答を待つ（レコード取得）
    await page.waitForResponse(
      response => response.url().includes('/k/v1/records') && response.ok(),
      { timeout: 30000 }
    );

    // Grid.jsのテーブル描画完了を待つ
    await page.waitForSelector('.gridjs-table', { state: 'visible', timeout: 15000 });

    // Grid.jsテーブルが表示されることを確認
    await expect(page.locator('.gridjs-table')).toBeVisible();

    // テーブルのヘッダーに正しい列名が表示されること
    const headers = page.locator('.gridjs-th');
    await expect(headers.nth(0)).toContainText('担当者');
    await expect(headers.nth(1)).toContainText('プロジェクトコード');
    await expect(headers.nth(2)).toContainText('プロジェクト名');
    await expect(headers.nth(3)).toContainText('カテゴリ');
    await expect(headers.nth(4)).toContainText('作業時間');

    // テーブルにデータ行が1件以上あること
    const rows = page.locator('.gridjs-table tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('検索結果が0件の場合、通知メッセージが表示される', async ({ page }) => {
    // 存在しないであろう担当者の条件で検索する
    // ドロップダウンの値をプログラムで設定（存在しないユーザーコード）
    await page.evaluate(() => {
      const dropdown = document.querySelector('#dropdown kuc-dropdown') as any;
      if (dropdown) {
        dropdown.value = 'nonexistent_user@example.com';
      }
    });

    // 検索ボタンをクリック
    const searchButton = page.locator('#Button kuc-button');
    await searchButton.click();

    // API応答を待つ
    await page.waitForResponse(
      response => response.url().includes('/k/v1/records') && response.ok(),
      { timeout: 30000 }
    );

    // KUC Notificationで「レコードが見つかりませんでした」メッセージが表示されること
    const notification = page.locator('kuc-notification');
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('クリアボタンで検索条件とテーブルがリセットされる', async ({ page }) => {
    // まず担当者を選択して検索を実行
    const dropdown = page.locator('#dropdown kuc-dropdown');
    await dropdown.click();
    const menuItems = dropdown.locator('.kuc-dropdown__select-menu__item');
    await menuItems.nth(1).click();

    const searchButton = page.locator('#Button kuc-button');
    await searchButton.click();

    // テーブルが表示されるまで待つ
    await page.waitForSelector('.gridjs-table', { state: 'visible', timeout: 30000 });

    // クリアボタンをクリック
    const clearButton = page.locator('#ClearButton kuc-button');
    await clearButton.click();

    // テーブルが消えること（#Table要素が削除される）
    await expect(page.locator('#Table')).toBeHidden({ timeout: 5000 });

    // 担当者ドロップダウンがクリアされていること
    const selectedValue = await page.evaluate(() => {
      const dd = document.querySelector('#dropdown kuc-dropdown') as any;
      return dd?.value;
    });
    expect(selectedValue).toBe('');
  });
});
