const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function run() {
  try {
    console.log("Calling handle_rfid_scan for 459AF605...");
    const resScan = await fetch(`${url}rpc/handle_rfid_scan`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ scanned_uid: "459AF605" })
    });
    console.log("Scan status:", resScan.status);

    // Fetch latest rfid_logs for this UID
    const resLogs = await fetch(`${url}rfid_logs?uid=eq.459AF605&order=created_at.desc&limit=2`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    console.log("rfid_logs for 459AF605 after scan:", await resLogs.json());
  } catch (err) {
    console.error(err);
  }
}

run();
