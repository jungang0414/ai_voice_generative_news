import axios from "axios";
import { supabase } from "../config/supabase.js";

// 計算時間戳
var startAt = Math.floor(new Date().getTime() / 1000) - 3 * 24 * 60 * 60;
var endAt = Math.floor(Math.round(new Date().getTime()) * 0.001);

// 鉅亨網
export const crawler_anue = async (req, res) => {

    // 新聞API
    const anue = `https://api.cnyes.com/media/api/v1/newslist/category/headline?page=1&limit=5&startAt=${startAt}&endAt=${endAt}`

    try {

        // 取得當天新聞資料 (最新三筆)
        const response = await axios.get(anue);
        const dateItems = response.data.items.data;

        // 遍歷及整理新聞資料
        for (const news of dateItems) {

            // 解碼 HTML 主體
            const decodedString = news.content.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&hellip;/g, ";").replace(/&quot;/g, "'").replace(/&ndash;/g, "-");

            // 移除p標籤
            const noTagPString = decodedString.replace(/<p[^>]*>/g, "").replace(/<\/p>/g, "");

            // 移除a(超連結)標籤保留內容
            const noTagAString = noTagPString.replace(/<a[^>]*>(.*?)<\/a>/g, "$1");

            // 移除figure標籤
            const noTagFigureString = noTagAString.replace(/<figure[^>]*>(.*?)<\/figure>/g, "");

            // 移除strong標籤
            const noTagStrongString = noTagFigureString.replace(/<strong[^>]*>(.*?)<\/strong>/g, "");

            // 移除div標籤
            const noTagDivString = noTagStrongString.replace(/<div[^>]*>(.*?)<\/div>/g, "");

            // 移除br標籤
            const noBrString = noTagDivString.replace(/<br>/g, ",");

            // 移除多餘的換行和空白
            const cleanContent = noBrString.replace(/\n\s*\n/g, "\n").replace(/\s+/g, " ").trim();

            // console.log(cleanContent);
            // console.log("                     ");
            const { error } = await supabase
                .from('anue_news')
                .insert([
                    {
                        news_title: news.title,
                        news_content: cleanContent,
                    }
                ]);

            if (error) {
                console.log("寫入資料庫發生錯誤!");
                res.json({ success: false, mseeage: error.message });
            }

        }

        res.json({ success: true, message: "新聞資料取得寫入資料庫成功!" });

    } catch (error) {
        console.error("請求出錯:", error);
        return res.json({ success: false, message: error.message });
    }
}