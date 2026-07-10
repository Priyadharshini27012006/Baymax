const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function callRpc(name, body) {
  try {
    const res = await fetch(`${url}rpc/${name}`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    console.log(`RPC ${name} with body ${JSON.stringify(body)} status: ${res.status}`);
    const text = await res.text();
    console.log("  Response:", text);
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  const uids = ['50C06F1E', '73793706', '459AF605', '7A42F505'];
  for (const uid of uids) {
    console.log(`--- Testing UID: ${uid} ---`);
    await callRpc("get_employee_name_from_rfid", { tag_uid: uid });
    await callRpc("toggle_rfid_status", { uid: uid });
    await callRpc("handle_rfid_scan", { scanned_uid: uid });
  }
}

run();
