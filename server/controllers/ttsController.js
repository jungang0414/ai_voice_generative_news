import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { promisify } from "util";

// 使用 promisify 轉換 fs 函數為 Promise 版本
const fsReadFile = promisify(fs.readFile);
const fsWriteFile = promisify(fs.writeFile);
const fsStat = promisify(fs.stat);
const fsAccess = promisify(fs.access);

// supabase
import { supabase } from "../config/supabase.js";

/**
 * 金鑰與服務區域
 * var audioConfig = sdk.AudioConfig.fromAudioFileOutput(filename);
 * var speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
 */


/** 
 * 語音模型使用: zh-CN-YunfanMultilingualNeural
 * 來源: https://learn.microsoft.com/zh-tw/azure/ai-services/speech-service/language-support?tabs=tts
 * speechConfig.speechSynthesisVoiceName = "zh-CN-YunfanMultilingualNeural";
*/


/**
 * 創建語音合成器
 * var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
 */


/**
 * 文檔範本:
 * var voice_text = "這是一個範例文檔, 用於生成語音檔案." +
 */


/**
 * 程式範本:
 * synthesizer.speakTextAsync(voice_text,
    function (result) {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            console.log("語音生成完畢!");
        } else {
            console.error("生成語音發生錯誤: " + result.errorDetails);
        }
        synthesizer.close();
    });
 */

var subscriptionKey = process.env.SPEECH_CONFIG_API_KEY;
var serviceRegion = process.env.SPEECH_CONFIG_ROGIN;

export const tts_generativeVoice = async (req, res) => {
    const { voice_title, voice_text, downloadPath } = req.body;

    // 參數驗證
    if (!voice_title) {
        return res.json({ success: false, message: "錯誤! 請輸入語音檔案標題!" });
    }

    if (!voice_text) {
        return res.json({ success: false, message: "錯誤! 請輸入欲生成的文檔文字!" });
    }

    try {
        // 建立安全的檔案名稱 (更嚴格處理，移除所有可能的特殊字符)
        const timestamp = Date.now();

        // 徹底清理檔案名稱，只保留基本字符
        const cleanTitle = voice_title
            .replace(/[^\w\s]/g, "") // 只保留英文字母、數字和空格
            .replace(/\s+/g, "_")    // 將空格替換為底線
            .substring(0, 20);       // 限制長度

        // 確保檔案名稱不為空
        const finalTitle = cleanTitle || "audio";
        const safeFileName = `${finalTitle}_${timestamp}`;

        // 建立暫存目錄路徑 (使用絕對路徑)
        const tempDir = path.join(process.cwd(), 'temp');

        // 確保暫存目錄存在並可寫入
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });
        } else {
            // 檢查目錄權限
            try {
                await fsAccess(tempDir, fs.constants.W_OK);
            } catch (err) {
                console.error(`暫存目錄 ${tempDir} 沒有寫入權限`);
                throw new Error(`無法寫入暫存目錄: ${err.message}`);
            }
        }

        // 建立完整的暫存檔案路徑
        const tempFilePath = path.join(tempDir, `${safeFileName}.wav`);

        // 處理下載路徑 (使用絕對路徑)
        const defaultVoiceDir = path.join(process.cwd(), "voice");

        // 使用提供的路徑或默認路徑
        const targetDownloadPath = downloadPath
            ? (path.isAbsolute(downloadPath) ? downloadPath : path.join(process.cwd(), downloadPath))
            : defaultVoiceDir;

        // 確保下載目錄存在並可寫入
        if (!fs.existsSync(targetDownloadPath)) {
            fs.mkdirSync(targetDownloadPath, { recursive: true, mode: 0o755 });
        } else {
            // 檢查目錄權限
            try {
                await fsAccess(targetDownloadPath, fs.constants.W_OK);
            } catch (err) {
                console.error(`目標目錄 ${targetDownloadPath} 沒有寫入權限`);
                throw new Error(`無法寫入目標目錄: ${err.message}`);
            }
        }

        // 設置本地檔案路徑 (使用不同的檔案名以避免衝突)
        const localFileName = `${finalTitle}_local_${timestamp}.wav`;
        const localFilePath = path.join(targetDownloadPath, localFileName);

        console.log("暫存檔案路徑:", tempFilePath);
        console.log("本地檔案路徑:", localFilePath);

        // 設置 Azure 語音合成
        const audioConfig = sdk.AudioConfig.fromAudioFileOutput(tempFilePath);
        const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);

        // 語音模型設定 - 使用高品質標準格式
        speechConfig.speechSynthesisVoiceName = "zh-CN-YunfanMultilingualNeural";
        speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm;

        // 創建語音合成器
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

        // 使用 Promise 包裝語音合成過程，並顯示進度
        console.log("開始生成語音...");
        console.time("語音生成耗時");

        const synthesizeText = () => {
            return new Promise((resolve, reject) => {
                synthesizer.speakTextAsync(
                    voice_text,
                    result => {
                        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                            console.log("Azure TTS 語音生成完畢!");
                            console.timeEnd("語音生成耗時");
                            resolve(tempFilePath);
                        } else {
                            console.error("Azure TTS 返回錯誤:", result.errorDetails || "未知錯誤");
                            reject(new Error(`語音生成錯誤: ${result.errorDetails || "未知錯誤"}`));
                        }
                        synthesizer.close();
                    },
                    error => {
                        console.error("Azure TTS 拋出異常:", error);
                        reject(new Error(`生成語音過程出錯: ${error.message || "未知錯誤"}`));
                        synthesizer.close();
                    }
                );
            });
        };

        // 執行語音合成
        const generatedFilePath = await synthesizeText();

        // 關鍵改進: 等待並確認檔案存在且完整
        let fileIsReady = false;
        let retryCount = 0;
        const maxRetries = 5;

        while (!fileIsReady && retryCount < maxRetries) {
            try {
                // 檢查檔案是否存在
                if (!fs.existsSync(generatedFilePath)) {
                    console.log(`暫存檔案尚未就緒，等待中... (${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 500)); // 等待 500ms
                    retryCount++;
                    continue;
                }

                // 檢查檔案大小
                const stats = await fsStat(generatedFilePath);
                console.log(`檔案大小: ${stats.size} bytes`);

                if (stats.size === 0) {
                    console.log(`檔案大小為 0，等待完整寫入... (${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 500)); // 等待 500ms
                    retryCount++;
                    continue;
                }

                // 檢查檔案是否可以讀取
                await fsAccess(generatedFilePath, fs.constants.R_OK);
                fileIsReady = true;

            } catch (err) {
                console.error(`檢查檔案時出錯: ${err.message}`);
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 500)); // 等待 500ms
            }
        }

        if (!fileIsReady) {
            throw new Error(`無法取得有效的語音檔案，已重試 ${maxRetries} 次`);
        }

        console.log(`語音檔案已準備就緒: ${generatedFilePath}`);

        // 讀取檔案內容 (使用 Promise 版本)
        console.log("正在讀取生成的檔案...");
        const fileBuffer = await fsReadFile(generatedFilePath);
        console.log(`成功讀取檔案，大小: ${fileBuffer.length} bytes`);

        if (fileBuffer.length === 0) {
            throw new Error("檔案內容為空");
        }

        // 複製到本地儲存位置 (使用 Promise 版本確保完成)
        console.log(`正在複製檔案到本地位置: ${localFilePath}`);
        await fsWriteFile(localFilePath, fileBuffer);
        console.log("檔案複製完成");

        // 檢查複製後的檔案
        if (!fs.existsSync(localFilePath)) {
            throw new Error("複製後的檔案不存在");
        }

        const localStats = await fsStat(localFilePath);
        if (localStats.size !== fileBuffer.length) {
            throw new Error(`複製後的檔案大小不符: ${localStats.size} vs ${fileBuffer.length}`);
        }

        console.log(`語音檔案已成功保存到本地: ${localFilePath}`);

        // 上傳檔案到 Supabase
        let supabaseUrl = null;
        try {
            // 使用更簡單的檔案名稱 (純數字，避免任何特殊字符)
            const supabasePath = `wav/${timestamp}.wav`;

            console.log(`正在上傳檔案到 Supabase: ${supabasePath}`);
            console.log(`上傳檔案大小: ${fileBuffer.length} bytes`);

            // 嘗試上傳到 Supabase (使用正確的 MIME 類型)
            const { data, error } = await supabase.storage
                .from('voice')
                .upload(supabasePath, fileBuffer, {
                    contentType: 'audio/wav; charset=utf-8', // 使用標準 MIME 類型
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                throw error;
            }

            console.log("檔案上傳成功，獲取公共 URL...");

            // 獲取公共 URL
            const { data: urlData } = supabase.storage
                .from('voice')
                .getPublicUrl(supabasePath);

            if (!urlData || !urlData.publicUrl) {
                throw new Error('無法獲取公共 URL');
            }

            supabaseUrl = urlData.publicUrl;
            console.log(`檔案已上傳至 Supabase, URL: ${supabaseUrl}`);

        } catch (supabaseError) {
            console.error("Supabase 上傳錯誤:", supabaseError);

            // 詳細的錯誤信息，但不中斷處理流程
            if (supabaseError.statusCode === '403') {
                console.log("由於權限問題，檔案未能上傳到雲端。請檢查儲存桶權限設置。");
            } else {
                console.log(`Supabase 上傳出錯: ${supabaseError.message}`);
            }
        }

        // 刪除暫存
        fs.unlinkSync(tempFilePath);

        // 回應客戶端
        res.json({
            success: true,
            message: "語音生成成功",
            filePath: localFilePath,
            supabaseUrl: supabaseUrl
        });

    } catch (error) {
        console.error("語音生成處理錯誤:", error.message);
        console.error(error.stack);

        return res.json({
            success: false,
            message: `發生錯誤: ${error.message || "未知錯誤"}`
        });
    }
};

