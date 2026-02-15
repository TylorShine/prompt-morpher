## 1. 全体アーキテクチャ（High Level）

```mermaid
flowchart LR
  U[User\nBrowser / Mobile Web] --> FE[Next.js Frontend\nReact + Dynamic UI]

  FE --> FAPI[/POST /api/form/generate/]
  FE --> AAPI[/POST /api/form/autofill/]
  FE --> PAPI[/POST /api/prompt/generate/]

  subgraph BE["Next.js API Routes (Server)"]
    FAPI --> ORCH[Orchestrator\nlib/server/gemini.ts]
    AAPI --> ORCH
    PAPI --> ORCH

    ORCH --> CACHE[Self Cache\nsqlite / memory]
    CACHE -. hit .-> ORCH

    ORCH --> CCTX[Context Cache Controller\nlib/server/ai/context-cache.ts]
    CCTX --> MC[(Model Context Cache\nVertex/Gemini)]

    ORCH --> PROV[Provider Resolver\nlib/server/ai/provider.ts]
    PROV --> GMD[Gemini API direct\n(API key / AIza...)]
    PROV --> VSTD[Vertex AI Standard\n(project+location+ADC)]
    PROV --> VEXP[Vertex AI Express\n(AQ... key)]

    ORCH --> POLICY[Form Policy JSON\nconfig/form-generation-policy.json]
    ORCH -. fallback .-> LOCAL[Local Template / Local Suggestion]
  end

  ORCH --> RES[JSON Response\nprovider/model/cache/warning]
  RES --> FE
```

## 2. フォーム生成シーケンス

```mermaid
sequenceDiagram
  autonumber
  participant User as User
  participant FE as Frontend
  participant API as /api/form/generate
  participant Orch as gemini.ts
  participant SCache as Self Cache
  participant Prov as Unified Provider

  User->>FE: テーマ入力して生成
  FE->>API: POST intent
  API->>Orch: generateFormWithGemini(intent)
  Orch->>SCache: getCachedFormResult(key)

  alt Self Cache Hit
    SCache-->>Orch: form
    Orch-->>API: cached response
    API-->>FE: form + cache=hit
  else Self Cache Miss
    Orch->>Prov: generateContent(schema付き)
    alt Schema深度エラー
      Orch->>Prov: JSON modeで再試行(schemaなし)
    end

    alt 正常にnormalize成功
      Orch->>SCache: setCachedFormResult(model output)
      Orch-->>API: generated form
      API-->>FE: form + cache=miss
    else 失敗/不正JSON
      Orch-->>API: local template fallback
      API-->>FE: warning付きfallback
      Note over Orch,SCache: fallback結果はキャッシュしない
    end
  end
```
