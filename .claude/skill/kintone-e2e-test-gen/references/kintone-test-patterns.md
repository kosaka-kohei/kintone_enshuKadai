# kintone テストパターン集

## 目次

1. [Playwright設定](#1-playwright設定)
2. [認証セットアップ](#2-認証セットアップ)
3. [共通ヘルパー](#3-共通ヘルパー)
4. [kintone UIセレクタ一覧](#4-kintone-uiセレクタ一覧)
5. [テストパターン: レコードフォーム](#5-テストパターン-レコードフォーム)
6. [テストパターン: カスタムビュー](#6-テストパターン-カスタムビュー)
7. [テストパターン: API連携](#7-テストパターン-api連携)
8. [テストデータのクリーンアップ](#8-テストデータのクリーンアップ)

---

## 1. Playwright設定

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  use: {
    baseURL: process.env.KINTONE_BASE_URL,
    actionTimeout: 10000,
    navigationTimeout: 30000,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

必要パッケージのインストール:

```bash
npm init -y
npm install -D @playwright/test dotenv
npx playwright install chromium
```

---

## 2. 認証セットアップ

```typescript
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('kintone login', async ({ page }) => {
  await page.goto('/login');

  await page.locator('input[name="username"]').fill(process.env.KINTONE_USERNAME!);
  await page.locator('input[name="password"]').fill(process.env.KINTONE_PASSWORD!);
  await page.locator('input[type="submit"]').click();

  // ポータル画面への遷移を待つ
  await page.waitForURL('**/k/');
  await expect(page.locator('.gaia-header-img-logo')).toBeVisible();

  await page.context().storageState({ path: authFile });
});
```

`.gitignore` に追加:

```
.auth/
```

---

## 3. 共通ヘルパー

```typescript
// tests/helpers/kintone-helpers.ts
import { Page, expect } from '@playwright/test';

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

/** 新規レコード画面に移動 */
export async function goToNewRecord(page: Page, appId: string) {
  await page.goto(`/k/${appId}/edit`);
  await waitForKintoneReady(page);
}

/** レコード編集画面に移動 */
export async function goToEditRecord(page: Page, appId: string, recordId: string) {
  await page.goto(`/k/${appId}/show#record=${recordId}&mode=edit`);
  await waitForKintoneReady(page);
}

/** カスタムビューに移動 */
export async function goToCustomView(page: Page, appId: string, viewId: string) {
  await page.goto(`/k/${appId}/?view=${viewId}`);
  await waitForKintoneReady(page);
}

/** レコードを保存（保存ボタンクリック） */
export async function saveRecord(page: Page) {
  await page.locator('.gaia-ui-actionmenu-save').click();
}

/** kintone REST APIでレコードを削除 */
export async function deleteRecords(page: Page, appId: string, recordIds: number[]) {
  if (recordIds.length === 0) return;
  await page.evaluate(
    async ({ appId, ids }) => {
      await (window as any).kintone.api('/k/v1/records.json', 'DELETE', {
        app: appId,
        ids: ids,
      });
    },
    { appId, ids: recordIds }
  );
}
```

---

## 4. kintone UIセレクタ一覧

### フォームフィールド

| 要素 | セレクタ | 備考 |
|---|---|---|
| 文字列1行 | `.field-<fieldCode> input` | |
| 数値 | `.field-<fieldCode> input` | |
| 日付 | `.field-<fieldCode> input` | `YYYY-MM-DD` 形式 |
| ドロップダウン | `.field-<fieldCode> select` | |
| ラジオボタン | `.field-<fieldCode> input[type="radio"]` | |
| チェックボックス | `.field-<fieldCode> input[type="checkbox"]` | |
| ユーザー選択 | `.field-<fieldCode> .input-user-cybozu` | 特殊なウィジェット |
| リッチエディタ | `.field-<fieldCode> iframe` | iframe内にコンテンツ |
| サブテーブル | `.subtable-<fieldCode>` | |
| サブテーブル行 | `.subtable-row-cybozu` | |
| フィールド値表示（詳細） | `.value-<fieldCode>` | 詳細画面での値表示 |

### ボタン・アクション

| 要素 | セレクタ |
|---|---|
| 保存ボタン | `.gaia-ui-actionmenu-save` |
| 編集ボタン | `.gaia-ui-actionmenu-edit` |
| キャンセルボタン | `.gaia-ui-actionmenu-cancel` |
| 削除ボタン | `.gaia-ui-actionmenu-delete` |
| 新規レコード追加 | `.gaia-ui-actionmenu-new` |
| サブテーブル行追加 | `.subtable-add-row-cybozu` |
| サブテーブル行削除 | `.remove-row-image-cybozu` |

### 一覧画面

| 要素 | セレクタ |
|---|---|
| レコード一覧テーブル | `.recordlist-table-cybozu` |
| レコード行 | `.recordlist-row-cybozu` |
| レコードセル | `.recordlist-cell-cybozu` |

### KUC（Kintone UI Component）

| 要素 | セレクタ |
|---|---|
| KUC Dropdown | `kuc-dropdown` |
| KUC DatePicker | `kuc-date-picker` |
| KUC Checkbox | `kuc-checkbox` |
| KUC Button | `kuc-button` |
| KUC Notification | `kuc-notification` |

### 注意

- kintoneの内部クラス名はCybozuのアップデートで変更される可能性がある
- 実際のセレクタはPlaywright MCPの `browser_snapshot` で確認するのが最も正確
- `npx playwright codegen <kintone-url>` でセレクタを自動生成することも可能

---

## 5. テストパターン: レコードフォーム

### 自動計算の検証

```typescript
test('フィールド変更時に合計が自動計算される', async ({ page }) => {
  await goToNewRecord(page, APP_ID);

  // サブテーブルの1行目に作業時間を入力
  const row = page.locator('.subtable-row-cybozu').first();
  await row.locator('input[name="作業時間_分"]').fill('120');
  await row.locator('input[name="作業時間_分"]').press('Tab');

  // 自動計算の完了を待つ
  await page.waitForTimeout(500);

  // 合計時間フィールドの値を検証
  const total = page.locator('.field-合計時間 input');
  await expect(total).toHaveValue('120');
});
```

### バリデーションエラーの検証

```typescript
test('保存時にバリデーションエラーが表示される', async ({ page }) => {
  await goToNewRecord(page, APP_ID);

  // 不正なデータで保存を試みる
  await saveRecord(page);

  // エラーメッセージの表示を待つ
  await page.waitForTimeout(1000);

  // kintoneのエラー表示またはカスタムエラーを確認
  // kintone標準: event.record.フィールド.error にセットしたメッセージ
  const error = page.locator('.input-error-cybozu');
  await expect(error.first()).toBeVisible();
});
```

### サブテーブル操作

```typescript
test('サブテーブルに行を追加できる', async ({ page }) => {
  await goToNewRecord(page, APP_ID);

  const initialRows = await page.locator('.subtable-row-cybozu').count();

  // 行追加ボタンをクリック
  await page.locator('.subtable-add-row-cybozu').first().click();

  const newRows = await page.locator('.subtable-row-cybozu').count();
  expect(newRows).toBe(initialRows + 1);
});
```

---

## 6. テストパターン: カスタムビュー

### KUCコンポーネントの表示確認

```typescript
test('カスタムビューに検索フォームが表示される', async ({ page }) => {
  await goToCustomView(page, APP_ID, VIEW_ID);

  await expect(page.locator('kuc-dropdown')).toBeVisible();
  await expect(page.locator('kuc-date-picker')).toBeVisible();
  await expect(page.locator('kuc-button')).toBeVisible();
});
```

### 検索と結果表示

```typescript
test('検索を実行すると結果テーブルが表示される', async ({ page }) => {
  await goToCustomView(page, APP_ID, VIEW_ID);

  // 検索条件を設定
  // KUC DatePickerのinputに日付を設定
  const datePicker = page.locator('kuc-date-picker').first();
  await datePicker.locator('input').fill('2026-01-01');

  // 検索ボタンをクリック
  await page.locator('kuc-button').click();

  // API応答を待つ
  await waitForKintoneApi(page, '/k/v1/records.json');

  // Grid.jsテーブルが表示されることを確認
  await expect(page.locator('.gridjs-table')).toBeVisible();
  const rows = page.locator('.gridjs-tr');
  expect(await rows.count()).toBeGreaterThan(0);
});
```

---

## 7. テストパターン: API連携

### APIレスポンスの監視

```typescript
test('レコード取得APIが正しく呼ばれる', async ({ page }) => {
  const responsePromise = waitForKintoneApi(page, '/k/v1/records.json');

  await goToCustomView(page, APP_ID, VIEW_ID);
  await page.locator('kuc-button').click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);
});
```

### APIエラーのモック

```typescript
test('API失敗時にエラー通知が表示される', async ({ page }) => {
  // APIレスポンスをモック
  await page.route('**/k/v1/records.json**', async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Internal Server Error' }),
    });
  });

  await goToCustomView(page, APP_ID, VIEW_ID);
  await page.locator('kuc-button').click();

  // KUC Notificationでエラー表示を確認
  await expect(page.locator('kuc-notification')).toBeVisible();
});
```

---

## 8. テストデータのクリーンアップ

```typescript
test.describe('レコード操作テスト', () => {
  const createdRecordIds: number[] = [];

  test.afterAll(async ({ page }) => {
    // テストで作成したレコードを削除
    await deleteRecords(page, APP_ID, createdRecordIds);
  });

  test('新規レコードを保存できる', async ({ page }) => {
    await goToNewRecord(page, APP_ID);

    // フィールドに値を入力...
    await saveRecord(page);

    // 保存後のURLからレコードIDを取得
    await page.waitForURL(/record=(\d+)/);
    const match = page.url().match(/record=(\d+)/);
    if (match) {
      createdRecordIds.push(parseInt(match[1]));
    }
  });
});
```
