import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// 優先使用服務角色密鑰，這樣可以繞過 RLS 策略限制
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
    }
});