import { supabase } from "../config/supabase.js";


// 抓取鉅亨網資料庫新聞資料
export const get_anue_news = async (req, res) => {

    try {

        let { data, error } = await supabase
            .from('anue_news')  // 替換為要抓取的資料庫表單
            .select('*') // 取得全部

        console.log("取得資料庫資料成功!")
        return res.json({ success: true, data });

    } catch (error) {
        console.error("請求出錯:", error);
        return res.json({ success: false, message: error.message });
    }

}

// 列出 Storage 已上傳的檔案並獲取公開 URL
export const get_anue_voice = async (req, res) => {
    try {
        // 獲取指定儲存桶中所有檔案
        const { data: fileList, error: listError } = await supabase.storage
            .from('voice')
            .list('wav', { // 檢索 'wav' 目錄下的檔案，根據您的結構調整
                sortBy: { column: 'created_at', order: 'desc' }, // 按創建時間降序排序
                limit: 100 // 限制返回數量
            });

        if (listError) {
            console.error("獲取檔案列表出錯:", listError);
            return res.json({ success: false, message: listError.message });
        }

        // 過濾出音頻檔案 (wav, mp3等)
        const audioFiles = fileList.filter(file => 
            !file.id.endsWith('/') && // 過濾掉目錄
            (file.name.endsWith('.wav') || file.name.endsWith('.mp3'))
        );

        // 為每個檔案獲取公開 URL
        const filesWithUrls = audioFiles.map(file => {
            // 生成完整檔案路徑
            const filePath = `wav/${file.name}`;
            
            // 獲取公開 URL
            const { data: urlData } = supabase.storage
                .from('voice')
                .getPublicUrl(filePath);
                
            // 返回包含詳細信息的對象
            return {
                id: file.id,
                name: file.name,
                size: file.metadata?.size || 0,
                created_at: file.created_at,
                url: urlData.publicUrl,
                type: file.name.split('.').pop() // 檔案類型 (wav, mp3等)
            };
        });

        console.log(`成功獲取 ${filesWithUrls.length} 個音頻檔案`);
        return res.json({ 
            success: true, 
            data: filesWithUrls,
            totalCount: filesWithUrls.length 
        });
    } catch (error) {
        console.error("請求出錯:", error);
        return res.json({ success: false, message: error.message });
    }
};