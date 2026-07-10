const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function run() {
  try {
    // 1. Update John Doe (EMP-101) assigned_machine_id = 'CNC-01'
    console.log("Updating John Doe...");
    const resUpdate = await fetch(`${url}operators?Operator_ID=eq.EMP-101`, {
      method: "PATCH",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ assigned_machine_id: "CNC-01" })
    });
    console.log("Update status:", resUpdate.status);

    // 2. Call handle_rfid_scan
    console.log("Calling handle_rfid_scan for John Doe...");
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

    // 3. Fetch latest rfid_logs for this UID
    const resLogs = await fetch(`${url}rfid_logs?uid=eq.50C06F1E&order=created_at.desc&limit=2`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    console.log("rfid_logs for 50C06F1E after scan:", await resLogs.json());
  } catch (err) {
    console.error(err);
  }
}

run();
