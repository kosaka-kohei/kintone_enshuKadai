# Playwright MCP セットアップガイド

## 1. .mcp.json への追加

プロジェクトルートの `.mcp.json` に以下を追加する:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic-ai/playwright-mcp", "--headed"]
    }
  }
}
```

### オプション

| フラグ | 説明 | デフォルト |
|---|---|---|
| `--headed` | ブラウザを表示して実行 | headless（非表示） |
| `--browser chromium\|firefox\|webkit` | 使用ブラウザ | chromium |
| `--viewport-size 1280,720` | ビューポートサイズ | - |

テスト目的では `--headed` を推奨（画面操作を目視確認できる）。

## 2. 利用可能なMCPツール

Playwright MCPは以下のツールを提供する:

### ナビゲーション
- `browser_navigate` — URLに移動
- `browser_go_back` — ブラウザの戻る
- `browser_go_forward` — ブラウザの進む

### ページ情報取得
- `browser_snapshot` — ページのアクセシビリティツリーを取得（DOM構造の確認に最適）
- `browser_screenshot` — スクリーンショットを撮影
- `browser_console_messages` — コンソールメッセージを取得

### 操作
- `browser_click` — 要素をクリック
- `browser_type` — テキストを入力
- `browser_press_key` — キーを押す（Enter, Tab等）
- `browser_hover` — 要素にホバー
- `browser_select_option` — ドロップダウンの選択
- `browser_file_upload` — ファイルアップロード

### タブ管理
- `browser_tab_list` — タブ一覧
- `browser_tab_create` — 新しいタブを作成
- `browser_tab_select` — タブを切り替え
- `browser_tab_close` — タブを閉じる

### その他
- `browser_wait` — 待機
- `browser_resize` — ビューポートサイズ変更
- `browser_pdf_save` — PDF保存

## 3. kintoneでの使い方の例

```
1. browser_navigate → https://<subdomain>.cybozu.com/login
2. browser_type → ユーザー名・パスワードを入力
3. browser_click → ログインボタンをクリック
4. browser_navigate → /k/<app_id>/edit（新規レコード画面）
5. browser_snapshot → フォーム構造を確認
6. browser_type → フィールドに値を入力
7. browser_screenshot → 結果をキャプチャ
```

## 4. 注意事項

- Playwright MCPはClaudeが対話的にブラウザを操作するためのツール。テストスクリプト（.spec.ts）の実行には別途 `@playwright/test` パッケージが必要
- headedモードではブラウザウィンドウが表示されるため、デスクトップ環境が必要
- kintoneのセッションはMCPのブラウザインスタンス内で維持される
