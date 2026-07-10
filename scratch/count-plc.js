const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function run() {
  try {
    const res = await fetch(`${url}plc_data?select=*&order=created_at.desc&limit=2000`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    const data = await res.json();
    console.log("Returned rows length:", data.length);
  } catch (err) {
    console.error(err);
  }
}

run();
