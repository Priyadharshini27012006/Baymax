const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function insertLogout() {
  const logoutRecord = {
    operator_id: "OP001",
    operator_name: "Neeraj",
    rfid_uid: "50C06F1E",
    machine_id: "CNC-01",
    shift: "Morning",
    event: "LOGOUT",
    created_at: new Date().toISOString()
  };

  try {
    const res = await fetch(`${url}operators_new`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(logoutRecord)
    });
    console.log(`Inserted LOGOUT record. Status: ${res.status}`);
  } catch (err) {
    console.error("Logout insert error:", err);
  }
}

insertLogout();
