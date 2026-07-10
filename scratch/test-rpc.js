const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "sb_publishable_E3JndF7HEJDUhQuBa6qTww_-rCyzhpW";

async function testRpc(rfid_tag, machine_no) {
  try {
    const res = await fetch(`${url}rpc/rfid_login`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ rfid_tag, machine_no })
    });
    console.log(`RPC rfid_login status: ${res.status}`);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await testRpc("50C06F1E", "CNC-01");
  await testRpc("50:C0:6F:1E", "CNC-01");
  await testRpc("459AF605", "CNC-01");
  await testRpc("45:9A:F6:05", "CNC-01");
}

run();
