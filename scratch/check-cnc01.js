const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function query(path) {
  try {
    const res = await fetch(`${url}${path}`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    console.log(`--- Path: ${path} (status: ${res.status}) ---`);
    console.log(await res.json());
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await query("plc_data?id=eq.1");
  await query("plc_data?order=created_at.desc&limit=5");
  await query("machines?machine_no=eq.CNC-01");
}

run();
