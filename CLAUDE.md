# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

kintone カスタマイズアプリ（日報アプリ）。kintone JavaScript API を使用して日報の入力・検索・集計機能を提供する。ビルドツールやバンドラーは使用しておらず、素のJavaScriptファイルを直接kintoneにアップロードするスタイル。

## Deploy

kintone環境へのアップロードは `kintone-customize-uploader` を使用:

```bash
# src/kintone_upload.txt に記載のコマンドを実行
./src/kintone_upload.bat nippo-manifest.json
```

マニフェストファイル: `src/_common/dev/dest/nippo-manifest.json`（対象アプリID: 7）

## Architecture

### ディレクトリ構成

- `src/日報/desktop/js/` — 日報アプリのカスタマイズJS
- `src/日報/desktop/css/` — 日報アプリのカスタマイズCSS
- `src/_common/lib/` — 共有ライブラリ（jQuery, jQuery UI, Kintone UI Component (KUC), Grid.js）
- `src/_common/dev/dest/` — kintone-customize-uploader用マニフェストファイル

### 主要ファイル

- **nippoApp.js** — レコード画面（新規/編集）の制御。合計時間の自動計算、入力バリデーション（担当者重複チェック、作業時間チェック、勤務時間超過チェック、日報重複チェック）
- **nippoAppSearch.js** — 一覧画面のカスタムビュー（viewId: 5978648）。担当者・期間・カテゴリによる検索、プロジェクト×カテゴリ別の作業時間集計、Grid.jsでのテーブル表示。表示順設定アプリ（ID: 12）と連携

### kintone フィールドコード

日報アプリで使用する主要フィールド: `担当者`（ユーザー選択）、`作業日`（日付）、`報告内容`（テーブル）、`合計時間`（数値）、`日報一括登録レコードID`
報告内容テーブル内: `プロジェクトコード`、`プロジェクト名`、`カテゴリ`、`作業時間_分`

### 使用ライブラリ

- jQuery 3.7.1 / jQuery UI — DOM操作
- Kintone UI Component (KUC) v1.21.0 — 検索フォームのUI部品（Dropdown, DatePicker, Checkbox, Button, Notification）
- Grid.js v6.2.0 — 検索結果テーブル表示

## Conventions

- kintone JavaScript APIのイベントハンドラパターン（`kintone.events.on`）で記述
- 即時実行関数(IIFE)でスコープを分離
- フィールドコード・変数名は日本語を使用
- REST APIは `kintone.api()` 経由で呼び出し
- レコード一括取得は再帰呼び出しによるページング（500件ずつ）
- ユーザー一括取得も再帰呼び出しによるページング（100件ずつ）

## Git Branching

- `main` — メインブランチ
- `develop` — 開発ブランチ
- フィーチャーブランチ例: `fix/nippoApp`
