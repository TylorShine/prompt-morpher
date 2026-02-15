# Prompt Morpher

意図入力から動的フォームを生成し、I2Pフレームワーク準拠の最終プロンプトを作る Next.js アプリです。  
`Gemini API direct` と `Vertex AI` を同じ抽象レイヤーで切り替えできます。

## 主な機能

- `POST /api/form/generate`
  - 意図からフォームJSONを生成（Structured Output）
- `POST /api/form/autofill`
  - フォームの未入力項目または指定項目をAIで補完
  - 失敗時はローカル候補へフォールバック
- `POST /api/prompt/generate`
  - 入力済みフォームからそのまま使える `system prompt` を生成
  - `includeSample=true` の場合のみ、結果サンプル (`sampleOutput`) も生成
- Provider abstraction
  - `AI_PROVIDER=gemini_api | vertex_ai | auto`
- 2層キャッシュ
  - Vertex/Gemini Context Cache（モデル側）
  - 抽象化された自前レスポンスキャッシュ（`sqlite` / `memory`）
- FE/BE分離
  - フロントエンド: `lib/client/morph-api-client.ts`
  - バックエンド: `app/api/*` + `lib/server/*`

## Setup

1. 依存関係をインストール
```bash
npm install
```

2. 環境変数を設定
```bash
cp example.env .env.local
```

## Provider設定

### 1) Gemini API direct
```env
AI_PROVIDER=gemini_api
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-3-flash-preview
```

### 2) Vertex AI
```env
AI_PROVIDER=vertex_ai
VERTEX_PROJECT_ID=your-gcp-project-id
VERTEX_LOCATION=us-central1
GEMINI_MODEL=gemini-3-flash-preview
```

Cloud Run上ではサービスアカウントのADCでVertex認証します。

### 3) Vertex AI Express mode (AQ... key)
```env
AI_PROVIDER=vertex_ai
VERTEX_EXPRESS_API_KEY=AQ.xxxxx
GEMINI_MODEL=gemini-2.5-flash
```

`AQ.` 形式のキーを `GEMINI_API_KEY` に設定している場合も、`AI_PROVIDER=vertex_ai` なら Express mode として利用します。  
`AI_PROVIDER=gemini_api` のままだと `API keys are not supported by this API` が発生します。

## キャッシュ設定

```env
SELF_CACHE_ENABLED=true
SELF_CACHE_BACKEND=sqlite
SELF_CACHE_DB_PATH=.cache/morph-prompt-cache.sqlite
FORM_RESULT_CACHE_TTL_SECONDS=43200
PROMPT_RESULT_CACHE_TTL_SECONDS=1800
CONTEXT_CACHE_ENABLED=true
CONTEXT_CACHE_TTL_SECONDS=21600
FORM_GENERATION_POLICY_PATH=config/form-generation-policy.json
```

`SELF_CACHE_BACKEND`:
- `sqlite`: ローカル永続キャッシュ（推奨）
- `memory`: プロセス内メモリキャッシュ
- `firestore`: 予約値（現時点では `memory` にフォールバック）

フォーム生成の指示は `config/form-generation-policy.json` で調整できます。  
`FORM_GENERATION_POLICY_PATH` を指定すれば別ファイルを読み込めます。

## Development

```bash
npm run dev
```

## Architecture Diagram

- 記事用のMermaid図: `docs/article-architecture-diagram.md`

## Cloud Run デプロイ

### Secret Manager に APIキーを登録（Gemini direct併用時）
```bash
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
```

既存Secretを更新する場合:
```bash
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
```

### Cloud Build でデプロイ
`cloudbuild.yaml` を使って実行:
```bash
gcloud builds submit --config cloudbuild.yaml
```

## APIレスポンス例

どちらのAPIも `provider`, `model`, `warning`, `cache` を返します。
`POST /api/prompt/generate` は `systemPrompt`（互換のため `result` にも同値）を返します。  
`includeSample=true` なら `sampleOutput` も返します。

```json
{
  "systemPrompt": "# Role\\n...",
  "result": "# Role\\n...",
  "sampleOutput": "（optional）system prompt の実行結果サンプル",
  "provider": "vertex_ai",
  "model": "gemini-3-flash-preview",
  "warning": "optional warning",
  "cache": {
    "selfCache": "miss",
    "contextCache": "created"
  }
}
```
