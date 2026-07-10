const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function run() {
  try {
    const newLog = {
      uid: "50C06F1E",
      login_time: new Date().toISOString(),
      logout_time: null,
      machine_status: "Active"
    };

    console.log("Inserting direct log into rfid_logs...");
    const res = await fetch(`${url}rfid_logs`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(newLog)
    });
    console.log("Status:", res.status);
    console.log("Response:", await res.json());
  } catch (err) {
    console.error(err);
  }
}

run();
