const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function run() {
  try {
    // Call handle_rfid_scan
    const res = await fetch(`${url}rpc/handle_rfid_scan`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ scanned_uid: "459AF605" })
    });
    console.log("Status:", res.status);
    
    // Fetch latest rfid_logs for this UID
    const res2 = await fetch(`${url}rfid_logs?uid=eq.459AF605&order=created_at.desc&limit=3`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    console.log("rfid_logs for 459AF605:", await res2.json());
  } catch (err) {
    console.error(err);
  }
}

run();
