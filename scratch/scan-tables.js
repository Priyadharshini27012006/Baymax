const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "sb_publishable_E3JndF7HEJDUhQuBa6qTww_-rCyzhpW";

async function checkTable(tableName) {
  try {
    const res = await fetch(`${url}${tableName}?select=*&limit=1`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    if (res.status === 200 || res.status === 406) {
      console.log(`Table EXISTS: ${tableName} (status: ${res.status})`);
      const text = await res.text();
      console.log(`  Preview: ${text}`);
    }
  } catch (err) {}
}

const candidates = [
  "operators", "operator_logs", "logs", "rfid_logs", "rfid_events",
  "operator_mapping", "operator_sessions", "operator_history", "mappings",
  "operator_assignments", "operator_assignment", "history", "machine_history",
  "scans", "rfid_scans", "rfid_data", "operator_mapping_history", "operator_mappings_history",
  "operator_history_logs", "operator_mapping_logs"
];

async function run() {
  for (const c of candidates) {
    await checkTable(c);
  }
}

run();
