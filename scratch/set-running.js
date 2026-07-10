const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function setStatusRunning() {
  try {
    const res = await fetch(`${url}plc_data?id=eq.1`, {
      method: "PATCH",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({ status: "running" })
    });
    console.log("Status update response status:", res.status);
    console.log("Updated row:", await res.json());
  } catch (err) {
    console.error("Update error:", err);
  }
}

setStatusRunning();
