const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";
const fs = require("fs");

async function run() {
  try {
    const res = await fetch(url, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    const data = await res.json();
    fs.writeFileSync("scratch/schema.json", JSON.stringify(data, null, 2), "utf8");
    console.log("Successfully wrote schema to scratch/schema.json");
  } catch (err) {
    console.error("Error fetching schema:", err);
  }
}

run();
