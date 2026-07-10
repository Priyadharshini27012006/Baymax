const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function insertRow(index) {
  const newRow = {
    di1: 1,
    di2: 0,
    di3: 0,
    di7: 1,
    di12: 0,
    created_at: new Date().toISOString()
  };

  try {
    const res = await fetch(`${url}plc_data`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newRow)
    });
    console.log(`[${index}] Inserted PLC row. Status: ${res.status}`);
  } catch (err) {
    console.error(`[${index}] Insert error:`, err);
  }
}

async function start() {
  console.log("Starting Long PLC Simulation (60 records, 1s intervals)...");
  let count = 0;
  const timer = setInterval(async () => {
    count++;
    await insertRow(count);
    if (count >= 60) {
      clearInterval(timer);
      console.log("Simulation finished.");
    }
  }, 1000);
}

start();
