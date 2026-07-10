const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function run() {
  try {
    // Fetch operators with service role key
    const res2 = await fetch(`${url}operators?select=*`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    console.log("operators (service role):", await res2.json());
  } catch (err) {
    console.error(err);
  }
}

run();
