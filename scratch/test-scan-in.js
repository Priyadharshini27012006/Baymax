const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function run() {
  try {
    console.log("Before scan-in:");
    const resOpsBefore = await fetch(`${url}operators?select=*`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    });
    console.log("operators:", await resOpsBefore.json());

    const resLogsBefore = await fetch(`${url}rfid_logs?uid=eq.50C06F1E&order=created_at.desc&limit=1`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    });
    console.log("rfid_logs for 50C06F1E:", await resLogsBefore.json());

    // Call handle_rfid_scan
    console.log("\nCalling handle_rfid_scan for 50C06F1E...");
    const resScan = await fetch(`${url}rpc/handle_rfid_scan`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ scanned_uid: "50C06F1E" })
    });
    console.log("Scan status:", resScan.status);

    console.log("\nAfter scan-in:");
    const resOpsAfter = await fetch(`${url}operators?select=*`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    });
    console.log("operators:", await resOpsAfter.json());

    const resLogsAfter = await fetch(`${url}rfid_logs?uid=eq.50C06F1E&order=created_at.desc&limit=1`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    });
    console.log("rfid_logs for 50C06F1E:", await resLogsAfter.json());
  } catch (err) {
    console.error(err);
  }
}

run();
