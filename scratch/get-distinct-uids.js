const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "sb_publishable_E3JndF7HEJDUhQuBa6qTww_-rCyzhpW";

async function run() {
  try {
    const res = await fetch(`${url}rfid_logs?select=uid`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    const data = await res.json();
    const uids = [...new Set(data.map(d => d.uid))];
    console.log("Distinct RFID UIDs:", uids);
  } catch (err) {
    console.error(err);
  }
}

run();
