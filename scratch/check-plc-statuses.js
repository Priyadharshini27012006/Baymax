const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function run() {
  try {
    const res = await fetch(`${url}plc_data?select=status,created_at&order=created_at.desc&limit=100`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    const data = await res.json();
    const counts = {};
    data.forEach(r => {
      const s = String(r.status);
      counts[s] = (counts[s] || 0) + 1;
    });
    console.log("Unique statuses in recent plc_data rows:", counts);
    console.log("Sample rows:", data.slice(0, 10));
  } catch (err) {
    console.error(err);
  }
}

run();
