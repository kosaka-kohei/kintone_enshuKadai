import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('kintone login', async ({ page }) => {
  await page.goto('/login');

  await page.locator('input[name="username"]').fill(process.env.KINTONE_USERNAME!);
  await page.locator('input[name="password"]').fill(process.env.KINTONE_PASSWORD!);
  await page.locator('input[type="submit"]').click();

  // ポータル画面への遷移を待つ
  await page.waitForURL('**/k/**');
  await expect(page.locator('.gaia-header-img-logo')).toBeVisible();

  await page.context().storageState({ path: authFile });
});
