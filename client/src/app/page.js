"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function Home() {

  // 標題、內文、路徑
  const [voice_text, setVoice_text] = useState("");
  const [voice_title, setVoice_title] = useState("");
  const [downloadPath, setDownloadPath] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  // 生成語音列表、載入狀態、展開狀態
  const [voiceList, setVoiceList] = useState([]);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [showVoiceList, setShowVoiceList] = useState(false);

  // 分頁相關狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // 資料庫列表
  const [anue_news_list, setAnue_news_list] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 計算當前頁面顯示的新聞
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = anue_news_list.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(anue_news_list.length / itemsPerPage);

  // 變更頁面的處理
  const handlePageChange = (pageNumber) => {
    setSelectedNewsIndex(null); // 換頁時如果有選取文章 取消選取
    setVoice_title("");
    setVoice_text("");
    setCurrentPage(pageNumber);
  };

  // 選擇下載路徑
  const handleSelectDirectory = async () => {

    // 若為雲端環境
    if (window.location.hostname !== 'localhost') {
      alert("在雲端環境中，音頻將自動儲存到雲端，無需選擇本地路徑。");
      setDownloadPath("cloud-storage");
      return;
    }
    try {
      // 使用 prompt 模擬文件選擇
      const initialPath = downloadPath || "./voice";
      const path = prompt("請輸入檔案儲存路徑 (如: C:\\Users\\Downloads):", initialPath);

      if (path) {
        // 簡單的路徑驗證
        if (path.includes("..")) {
          throw new Error("路徑不安全: 不允許包含 '..'");
        }

        setDownloadPath(path);
        console.log("設置下載路徑:", path);
      }
    } catch (error) {
      console.error("選擇目錄錯誤:", error);
      alert("選擇目錄失敗: " + error.message);
    }
  };

  // 語音生成節流和倒計時
  const [isGenerativeThrottled, setIsGenerativeThrottled] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const timeRef = useRef(null);

  // 生成語音
  const handleGenerateTextVoice = async () => {
    // 檢查節流狀態
    if (isGenerativeThrottled) {
      alert(`請等待 ${cooldownTime} 秒後再次嘗試生成語音`);
      return;
    }

    // 驗證輸入
    if (!voice_text) {
      alert("錯誤! 請輸入欲生成文檔文字!");
      return;
    }

    // 字數限制
    if (voice_text.length > 400) {
      alert("字數過多 請減少字數")
      return;
    }

    try {
      // 設置為節流狀態
      setIsGenerativeThrottled(true);
      setCooldownTime(30);
      startCooldownTime();

      // 顯示生成中
      setLoading(true);

      // 創建可取消的請求
      const controller = new AbortController();
      const signal = controller.signal;

      // 設置請求超時
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超時

      const response = await fetch("http://localhost:3001/api/v1/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voice_title: voice_title || "新聞標題",
          voice_text: voice_text,
          downloadPath: downloadPath || "./voice" // 使用默認路徑 ./voice
        }),
        signal
      });

      // 清除超時
      clearTimeout(timeoutId);

      // 驗證回應
      if (!response.ok) {
        throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
      }

      const result = await response.json();
      console.log("伺服器回應狀態: ", result);

      if (result.success) {
        // 顯示成功信息，並添加 Supabase URL 的信息
        let successMessage = `語音生成完畢! 儲存位置: ${result.filePath || "預設位置"}`;

        if (result.supabaseUrl) {
          successMessage += `\n\n在線播放連結: ${result.supabaseUrl}`;

          // 將 Supabase URL 也存入狀態，以便後續使用
          setAudioUrl(result.supabaseUrl);
        }

        alert(successMessage);
      } else {
        console.error("語音生成出現錯誤: ", result.message);
        alert(`語音生成失敗: ${result.message}`);
      }
    } catch (error) {
      // 檢查是否為取消請求的錯誤
      if (error.name === 'AbortError') {
        console.error("請求已取消: 操作超時或被用戶中斷");
        alert("語音生成請求已取消: 操作超時或被中斷");
      } else {
        console.error("請求出錯:", error);
        alert(`語音生成請求失敗: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 倒數計時器
  const startCooldownTime = useCallback(() => {

    // 初始化計時器 (清除現有計時器)
    if (timeRef.current) {
      clearInterval(timeRef.current);
    }

    // 設置計時器
    timeRef.current = setInterval(() => {
      setCooldownTime(prevTime => {
        const newTime = prevTime - 1;
        if (newTime <= 0) {
          // 倒計時結束，清除計時器
          clearInterval(timeRef.current);
          setIsGenerativeThrottled(false);
          return 0;
        }
        return newTime;
      });
    }, 1000);
  }, []);

  // 組件卸載並清除計時器
  useEffect(() => {
    return () => {
      if (timeRef.current) {
        clearInterval(timeRef.current);
      }
    };
  }, []);

  // 避免不必要渲染
  const generateButton = useMemo(() => {
    if (isGenerativeThrottled) {
      return `請等待 (${cooldownTime}秒)，再點擊生成!`
    }
    return "生成語音";
  }, [isGenerativeThrottled, cooldownTime]);

  // 選取新聞列表索引、展開列表索引
  const [selectedNewsIndex, setSelectedNewsIndex] = useState(null);
  const [expandedNewsIndex, setExpandedNewsIndex] = useState(null);

  // 選擇新聞 (使用useCallback記憶函數避免在畫面渲染時重新建立函數)
  const selectNews = useCallback((index) => {

    // 根據實際選取的頁面來計算索引
    const actualIndex = indexOfFirstItem + index;

    if (selectedNewsIndex === actualIndex) {
      setSelectedNewsIndex(null);
      setVoice_title("");
      setVoice_text("");
    } else {
      const selectedNews = anue_news_list[actualIndex];
      setVoice_title(selectedNews.news_title);
      setVoice_text(selectedNews.news_content);
      setSelectedNewsIndex(actualIndex);
    }
  }, [indexOfFirstItem, selectedNewsIndex, anue_news_list]);

  // 展開文章(考慮分頁狀態)
  const toggleExpandNews = useCallback((index, event) => {
    event.stopPropagation();
    const actualIndex = indexOfFirstItem + index;
    setExpandedNewsIndex(expandedNewsIndex === actualIndex ? null : actualIndex);
  }, [indexOfFirstItem, expandedNewsIndex]);

  // 爬取新聞請求節流狀態
  const [isFetchingThrottled, setIsFetchingThrottled] = useState(false);

  // 爬取最新新聞文章
  const handleFetchNews = async () => {

    if (isFetchingThrottled) {
      alert("請求過於頻繁，請稍後在試");
      return;
    }

    try {

      // 設置請求節流
      setIsFetchingThrottled(true);

      // 顯示加載中提示
      setLoading(true);

      const response = await fetch("http://localhost:3001/api/v1/news/anue");

      if (!response.ok) {
        throw new Error(`HTTP 請求發生錯誤: ${response.status}`);
      }

      const result = await response.json();
      console.log("伺服器回應狀態: ", result);

      if (result.success) {
        alert("新聞資料取得成功!");
        // 並重新載入資料庫數據
        fetchAnueNewsList();
      } else {
        console.error("新聞資料取得失敗: ", result.message);
        alert("新聞資料取得失敗: " + result.message);
      }
    } catch (error) {
      console.error("請求出錯:", error);
      alert("新聞資料取得失敗: " + error.message);
      setError(error);
    } finally {
      // 結束加載狀態
      setLoading(false);

      // 設定定時器。會在30秒後解除節流狀態
      setTimeout(() => {
        setIsFetchingThrottled(false);
      }, 30000);
    }
  }

  // 抓取資料庫中新聞列表
  const fetchAnueNewsList = async () => {

    // 載入延遲
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        // 本地環境
        // "http://localhost:3001/api/v1/database/anue"

        // 替換為 Vercel 部屬的 後端api server
        "http://localhost:3001/api/v1/database/anue"
      );

      if (!response.ok) {
        throw new Error(`HTTP 請求發生錯誤: ${response.status}`);
      }

      const data = await response.json();
      setAnue_news_list(data.data);
      console.log(data.data);

    } catch (err) {
      setError(err);
      console.error("請求錯誤:", err);
    } finally {
      setLoading(false);
    }
  }

  // 抓取資料庫中已生成新聞語音列表
  const fetchVoiceList = async () => {
    setIsLoadingVoice(true);

    try {
      const response = await fetch("http://localhost:3001/api/v1/database/anue_voice")
      if (!response.ok) {
        throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setVoiceList(result.data);
      } else {
        console.error("獲取語音列表失敗:", result.message);
      }

    } catch (error) {
      console.error("獲取語音列表出錯:", error);
    } finally {
      setIsLoadingVoice(false);
    }
  }

  useEffect(() => {
    fetchAnueNewsList();
    fetchVoiceList();
  }, []);

  // 播放所選語音
  const playVoice = (url) => {
    setAudioUrl(url);

    // 可選：滾動到音頻播放器
    setTimeout(() => {
      document.querySelector('.audio-player')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 100);
  };

  // 分頁導航元件
  const Pagination = () => {
    return (
      <div className="flex justify-center mt-4 space-x-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded ${currentPage === 1
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'}`}
        >
          上一頁
        </button>

        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            onClick={() => handlePageChange(index + 1)}
            className={`px-3 py-1 rounded ${currentPage === index + 1
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            {index + 1}
          </button>
        ))}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded ${currentPage === totalPages
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'}`}
        >
          下一頁
        </button>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">鉅亨網新聞語音生成器</h1>

      <main className="flex flex-col lg:flex-row gap-6">
        {/* 新聞列表區塊 */}
        <div className="lg:w-1/2">
          <h2 className="text-xl font-semibold mb-4">最新新聞列表</h2>

          {error &&
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {`Error: ${error}`}
            </div>
          }

          {loading ? (
            <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
              <div className="animate-pulse">新聞資料載入中......</div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {currentItems && currentItems.length > 0 ? (
                  currentItems.map((news, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedNewsIndex === indexOfFirstItem + index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      onClick={() => selectNews(index)}
                    >
                      <h3 className="font-medium">{news.news_title}</h3>
                      <p
                        className={`text-sm text-gray-500 mt-1 ${expandedNewsIndex === (indexOfFirstItem + index) ? '' : 'line-clamp-2'}`}
                      >
                        {news.news_content}
                      </p>
                      <button
                        className="text-xs text-blue-500 mt-1 hover:underline"
                        onClick={(e) => toggleExpandNews(index, e)}
                      >
                        {expandedNewsIndex === (indexOfFirstItem + index) ? '收合' : '展開'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    無可用新聞數據
                  </div>
                )}
              </div>

              {anue_news_list.length > 0 && <Pagination />}
            </>
          )}
        </div>

        {/* 語音生成區塊 */}
        <div className="lg:w-1/2 mt-6 lg:mt-0">
          <div className="mb-4">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
              onClick={handleFetchNews}
            >
              爬取最新新聞文章
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border">
            <h2 className="text-xl font-semibold mb-4">語音生成</h2>

            <div className="mb-4">
              <label htmlFor="voice-title" className="block text-sm font-medium text-gray-700 mb-1">
                標題
              </label>
              <input
                id="voice-title"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={voice_title}
                onChange={(e) => setVoice_title(e.target.value)}
                placeholder="請輸入語音標題"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="voice-text" className="block text-sm font-medium text-gray-700 mb-1">
                內容
              </label>
              <textarea
                id="voice-text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={voice_text}
                onChange={(e) => setVoice_text(e.target.value)}
                placeholder="請輸入或選擇新聞內容"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="download-path" className="block text-sm font-medium text-gray-700 mb-1">
                儲存路徑
              </label>
              <div className="flex">
                <input
                  id="download-path"
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={downloadPath}
                  onChange={(e) => setDownloadPath(e.target.value)}
                  placeholder="選擇儲存路徑或保留空白使用預設路徑voice"
                  readOnly
                />
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-r-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
                  onClick={handleSelectDirectory}
                >
                  選擇路徑
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              {audioUrl ? (
                <a
                  href={audioUrl}
                  target="_blank"
                  className="px-4 py-2 mr-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  rel="noopener noreferrer"
                >
                  在新視窗中側聽
                </a>
              ) : (
                <button
                  className="px-4 py-2 mr-2 rounded-md bg-gray-300 text-gray-500 cursor-not-allowed"
                  disabled
                >
                  尚未生成語音
                </button>
              )}
              <button
                className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors ${isGenerativeThrottled
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                onClick={handleGenerateTextVoice}
                disabled={isGenerativeThrottled}
              >
                {generateButton}
              </button>
            </div>
          </div>

          {/* 播放器 */}
          {audioUrl && (
            <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50 audio-player">
              <h4 className="font-medium text-blue-700 mb-2">當前語音</h4>
              <div className="bg-white rounded p-3">
                <audio
                  controls
                  className="w-full"
                  src={audioUrl}
                  controlsList="nodownload"
                  autoPlay
                  onPlay={() => console.log("開始播放")}
                  onError={(e) => {
                    console.error("音頻載入錯誤", e);
                    alert("音頻播放失敗，請嘗試在新視窗中打開或重新生成");
                  }}
                >
                  您的瀏覽器不支援 HTML5 音頻播放
                </audio>
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-500 flex-wrap">
                <span className="truncate max-w-[70%]" title={audioUrl}>檔案: {audioUrl.split('/').pop()}</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(audioUrl).then(() => alert("已複製語音 URL 到剪貼簿"))}
                    className="text-blue-500 hover:underline"
                  >
                    複製連結
                  </button>
                  <a
                    href={audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    新視窗開啟
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* 預覽區塊 */}
          {voice_title || voice_text ? (
            <div className="mt-6 bg-gradient-to-r from-teal-400 to-blue-400 rounded-lg p-6 text-white shadow-md">
              <h3 className="font-medium mb-2 border-b border-white pb-2">
                {voice_title || "未設定標題"}
              </h3>
              <p className="text-sm">
                {voice_text || "未設定內容"}
              </p>
            </div>
          ) : null}

          {/* 已生成的語音列表 */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">已生成的語音列表</h3>
              <button
                onClick={() => {
                  setShowVoiceList(!showVoiceList);
                  if (!showVoiceList && voiceList.length === 0) {
                    fetchVoiceList();
                  }
                }}
                className="text-sm text-blue-500 hover:underline"
              >
                {showVoiceList ? "隱藏列表" : "顯示列表"}
              </button>
            </div>

            {showVoiceList && (
              <div className="bg-white rounded-lg shadow-md border p-4">
                {isLoadingVoice ? (
                  <div className="py-4 text-center">載入語音列表中...</div>
                ) : voiceList.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {voiceList.map((voice, index) => (
                      <div key={index} className="p-3 border rounded hover:bg-gray-50 flex justify-between items-center">
                        <div>
                          <div className="font-medium">{voice.name.replace(/\.wav$/, '').replace(/_/g, ' ')}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(voice.created_at || Date.now()).toLocaleString()}
                            {voice.size && ` · ${Math.round(voice.size / 1024)} KB`}
                          </div>
                        </div>
                        <button
                          onClick={() => playVoice(voice.url)}
                          className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                        >
                          播放
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-gray-500">尚無生成的語音檔案</div>
                )}

                <div className="mt-4 flex justify-center">
                  <button
                    onClick={fetchVoiceList}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                  >
                    重新整理
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
