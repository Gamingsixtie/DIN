import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
function loadEnvFile(p:string){if(!existsSync(p))return;const c=readFileSync(p,"utf-8");for(const l of c.split(/\r?\n/)){const t=l.trim();if(!t||t.startsWith("#"))continue;const e=t.indexOf("=");if(e===-1)continue;const k=t.substring(0,e).trim();const v=t.substring(e+1).trim().replace(/^["']|["']$/g,"");if(!process.env[k])process.env[k]=v;}}
loadEnvFile(join(process.cwd(),".env.local"));
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const prefix = process.argv[2];
(async()=>{
  const { data, error } = await supa.from("din_sessions").select("id, name, updated_at").order("updated_at", { ascending: false }).limit(50);
  if (error) console.error("ERR:", error);
  console.log("count:", data?.length);
  for (const r of data ?? []) {
    if (r.id.startsWith(prefix)) console.log(r.id, "|", r.name);
  }
})();
