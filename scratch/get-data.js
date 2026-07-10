const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "sb_publishable_E3JndF7HEJDUhQuBa6qTww_-rCyzhpW";

async function run() {
  try {
    // 1. Fetch rfid_logs
    const res1 = await fetch(`${url}rfid_logs?select=*&order=created_at.desc&limit=10`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    console.log("rfid_logs:", await res1.json());

    // 2. Fetch operators
    const res2 = await fetch(`${url}operators?select=*&limit=10`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    console.log("operators:", await res2.json());
  } catch (err) {
    console.error(err);
  }
}

run();
