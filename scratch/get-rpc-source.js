const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function queryRoutines() {
  try {
    const res = await fetch(`${url}pg_proc?select=proname,prosrc&proname=in.(get_employee_name_from_rfid,toggle_rfid_status,handle_rfid_scan)`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    console.log("pg_proc Status:", res.status);
    console.log("pg_proc Data:", await res.json());
  } catch (err) {
    console.error(err);
  }
}

async function queryRoutinesAlt() {
  try {
    const res = await fetch(`${url}routines?select=*&routine_name=in.(get_employee_name_from_rfid,toggle_rfid_status,handle_rfid_scan)`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    console.log("routines Status:", res.status);
    console.log("routines Data:", await res.json());
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await queryRoutines();
  await queryRoutinesAlt();
}

run();
