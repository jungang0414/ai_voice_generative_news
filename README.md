# 鉅亨網新聞語音合成器

[示範畫面&語音檔](https://github.com/jungang0414/ai_voice_generative_news/tree/main/server/voice)

## 架構

:::spoiler 整理流程
```mermaid
graph TD
    A[用戶訪問網站] --> B[加載頁面]
    B --> C[顯示鉅亨網新聞列表]
    C --> D{用戶操作}
    
    D -->|選擇新聞| E[填充新聞內容到編輯區]
    D -->|編輯文本| F[修改待轉換文本]
    D -->|本地環境設置存儲路徑| G[選擇語音檔存儲位置]
    D -->|雲端環境不需設置| Z[不需選擇存儲位置]
    
    E --> H[點擊生成語音]
    F --> H
    G --> H
    Z --> H
    
    H --> I[發送請求到後端]
    I --> J[Azure 語音合成]
    J --> K[生成 WAV 檔案]
    
    K --> L{部署環境}
    L -->|本地環境| M[保存到指定路徑]
    L -->|雲端環境| N[保存到臨時目錄]
    
    M --> O[上傳檔案到 Supabase]
    N --> O
    
    O --> P[返回語音 URL 到前端]
    P --> Q[顯示成功訊息和播放選項]
    
    R[鉅亨網 API] --> |手動更新| T[處理新聞數據]
    T --> U[存入 Supabase 資料庫]
    U --> C 
```
:::

:::spoiler 系統架構
```mermaid
graph TB
    subgraph "前端 (Next.js)"
        A1[新聞展示頁面] --> A2[語音生成介面]
        A2 --> A3[語音播放元件]
    end
    
    subgraph "後端 (Express)"
        B1[新聞 API] --> B2[語音合成控制器]
        B3[Supabase 連接器] --> B1
        B3 --> B2
    end
    
    subgraph "外部服務"
        C1[鉅亨網 API] --> B1
        B2 --> C2[Azure 語音服務]
        B2 --> C3[Supabase 存儲]
    end
    
    A1 --> B1
    A2 --> B2
    A3 --> C3
```
:::

:::spoiler 數據流程
```mermaid
sequenceDiagram
    participant User as 用戶
    participant Client as 前端應用
    participant Server as 後端服務
    participant Azure as Azure 語音服務
    participant DB as Supabase 資料庫
    
    User->>Client: 訪問網站
    Client->>Server: 請求新聞列表
    Server->>DB: 查詢新聞數據
    DB-->>Server: 返回新聞列表
    Server-->>Client: 返回新聞數據
    Client-->>User: 顯示新聞列表
    
    User->>Client: 選擇新聞/編輯文本
    User->>Client: 點擊生成語音
    Client->>Server: 發送語音生成請求
    Server->>Azure: 請求語音合成
    Azure-->>Server: 返回語音數據
    Server->>DB: 存儲語音文件
    DB-->>Server: 返回存儲 URL
    Server-->>Client: 返回語音 URL
    Client-->>User: 顯示成功訊息和播放選項
```
:::

## 主要功能

- 新聞爬取：自動從鉅亨網 API 獲取最新財經新聞
- 數據存儲：使用 [supabase](https://supabase.com/) 數據庫持久化存儲新聞內容
- 分頁顯示：前端實現了新聞列表分頁功能，每頁顯示 5 條新聞
- 語音合成：使用 Azure [Speech Studio](https://learn.microsoft.com/zh-tw/azure/ai-services/speech-service/speech-studio-overview) 將文本轉換為自然流暢的中文語音
- 自定義存儲路徑：允許用戶選擇語音文件的存儲位置

## 技術棧

- 前端：Next.js、React、Tailwind CSS
- 後端：Node.js、Express
- API：Azure Cognitive Services（語音合成）、鉅亨網 API（新聞數據）
- 數據存儲：Supabase（PostgreSQL）
- 其他：Microsoft Speech SDK、Axios、Github Copilot

## 技術特點

- 使用最新的 React Hooks 實現狀態管理
- 響應式設計，適配不同屏幕尺寸
- 錯誤處理和用戶友好的提示信息
- 安全的文件系統操作，包括路徑驗證和文件名清理
- 跨平台文件路徑兼容性

## 學習亮點

- API 設計與整合
- 數據爬取與處理
- 非同步操作管理
- 用戶界面設計與交互
- 錯誤處理與可靠性保障
- 第三方服務整合

## 若要在本地運行

克隆檔案至本地
```
git clone https://github.com/jungang0414/ai_voice_generative_news.git
```

cd server & cd client下載所需依賴
```
npm i
```

請新增.env至server資料夾並新增以下變數
```
GOOGLE_GENERATIVE_AI_API_KEY = "替換為自己的KEY"
SPEECH_CONFIG_API_KEY = "替換為自己的KEY"
SPEECH_CONFIG_ROGIN = "替換為自己的ROGIN"

PORT = "可以自己設定 不過Next預設會占用3000所以可以改成其他的"

SUPABASE_URL = "替換為自己的資料庫連結"
SUPABASE_KEY = "替換為自己的資料庫KEY"
```

運行伺服器
```
npm run server
```

前端頁面
```
npm run dev
```
