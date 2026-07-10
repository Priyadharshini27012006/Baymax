const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function querySchema(profile, path) {
  try {
    const res = await fetch(`${url}${path}`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Accept-Profile": profile
      }
    });
    console.log(`Profile: ${profile}, Path: ${path}, Status: ${res.status}`);
    const data = await res.json();
    console.log("Data snippet:", JSON.stringify(data, null, 2).substring(0, 1500));
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await querySchema("information_schema", "routines?routine_name=in.(get_employee_name_from_rfid,toggle_rfid_status,handle_rfid_scan)");
}

run();
