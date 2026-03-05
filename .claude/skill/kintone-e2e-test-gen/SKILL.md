---
name: kintone-e2e-test-gen
description: kintoneカスタマイズアプリのE2Eテスト（Playwright）スクリプトを生成するスキル。kintoneのカスタマイズJS（イベントハンドラ、バリデーション、自動計算、カスタムビュー等）に対してPlaywrightテストコードを自動生成する。ユーザーが「テストを書いて」「E2Eテスト」「Playwrightテスト」「画面テスト」「動作テスト」「kintoneのテスト」などと言った場合にこのスキルを使用すること。テスト対象のコードが指定されていなくても、kintoneプロジェクト内でテストの話が出たら積極的にこのスキルを使うこと。
---

# kintone E2E Test Generator

kintoneカスタマイズコードを読み取り、Playwright形式のE2Eテストスクリプト（`.spec.ts`）を生成する。

## 前提条件

### Playwright MCP のセットアップ

テスト生成前に、Playwright MCPが `.mcp.json` に設定されていることを確認する。未設定の場合は `references/playwright-mcp-setup.md` を読んで案内する。

### 環境変数

テスト実行には `.env` に以下が必要:

```
KINTONE_BASE_URL=https://<subdomain>.cybozu.com
KINTONE_USERNAME=<username>
KINTONE_PASSWORD=<password>
KINTONE_APP_ID=<app_id>
```

## テスト生成の流れ

### Step 1: 対象コードの分析

1. ユーザーが指定したカスタマイズJSファイルを読む
2. 以下を特定する:
   - `kintone.events.on` で登録されているイベントハンドラ
   - 使用しているフィールドコード
   - バリデーションロジック（保存前イベントでのエラーチェック）
   - 自動計算ロジック（フィールド値変更時の連動）
   - カスタムビューの描画処理
   - REST API呼び出し（`kintone.api()`）
   - 外部ライブラリ（KUC、Grid.js、jQuery等）の使用箇所

### Step 2: テストケースの設計

分析結果から、以下のカテゴリでテストケースを洗い出す:

**フォーム操作テスト**
- フィールドへの入力と値の反映
- サブテーブルの行追加・削除
- ドロップダウン・ラジオボタン等の選択操作

**バリデーションテスト**
- 必須項目の未入力チェック
- カスタムバリデーション（重複チェック、範囲チェック等）
- エラーメッセージの表示確認

**自動計算テスト**
- フィールド変更時の連動計算
- 合計値の自動更新

**カスタムビューテスト**
- 検索フォームの表示
- 検索実行と結果表示
- テーブル（Grid.js等）のデータ表示

**API連携テスト**
- レコード取得・作成・更新の成功ケース
- APIエラー時のハンドリング

### Step 3: テストスクリプト生成

`references/kintone-test-patterns.md` のパターンを参照しながら `.spec.ts` ファイルを生成する。

生成するファイル構成:

```
tests/
├── playwright.config.ts      # Playwright設定
├── auth.setup.ts              # kintoneログイン認証
├── helpers/
│   └── kintone-helpers.ts     # 共通ヘルパー（セレクタ、待機関数）
└── <対象ファイル名>.spec.ts   # テストスクリプト
```

#### テスト生成時のルール

1. **認証は storageState パターンを使う** — `auth.setup.ts` でログインし、セッションを `.auth/user.json` に保存。各テストで再利用する
2. **kintone固有のセレクタを使う** — `references/kintone-test-patterns.md` のセレクタ一覧を参照
3. **kintoneの非同期処理を考慮する** — `waitForLoadState('networkidle')` や `waitForResponse` でAPI完了を待つ
4. **テストデータのクリーンアップを含める** — テストで作成したレコードは `afterEach` で削除する
5. **日本語のフィールドコードをそのまま使う** — kintoneではフィールドコードが日本語なのでテストでもそのまま使用
6. **タイムアウトを十分に設定する** — kintoneは画面遷移が遅いため `actionTimeout: 10000`, `navigationTimeout: 30000` を基本とする

### Step 4: ユーザーへの提示

生成したテストスクリプトを提示し、以下を説明する:
- テストの実行方法（`npx playwright test`）
- 各テストケースが何を検証しているか
- テスト環境の準備事項（.env設定、テストデータ等）

## Playwright MCP を使った対話的テスト

ユーザーが「実際に画面を動かしてテストして」と依頼した場合は、Playwright MCPツールを使って対話的にテストを実行できる。

1. `browser_navigate` でkintoneアプリに移動
2. `browser_snapshot` でページ構造を確認
3. `browser_click`, `browser_type` で画面操作
4. `browser_screenshot` で結果をキャプチャ
5. 操作結果をもとにテストスクリプトの精度を改善

この対話的テストで得たセレクタ情報を `.spec.ts` に反映することで、より正確なテストスクリプトが生成できる。

## 参考資料

- `references/playwright-mcp-setup.md` — Playwright MCPのセットアップ手順
- `references/kintone-test-patterns.md` — kintone用テストパターン集（セレクタ、認証、ヘルパー関数）
