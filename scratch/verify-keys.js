const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/machines";
const pubKey = "sb_publishable_E3JndF7HEJDUhQuBa6qTww_-rCyzhpW";
const secKey1 = "eyJ_YOUR_SUPABASE_SERVICE_ROLE_KEY";
const secKey2 = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function test(key, label) {
  try {
    const res = await fetch(url, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    console.log(`${label} status: ${res.status}`);
    const text = await res.text();
    console.log(`${label} body length: ${text.length}`);
    if (res.status !== 200) console.log(`${label} body:`, text);
  } catch (err) {
    console.error(label, err);
  }
}

async function run() {
  await test(pubKey, "Publishable Key");
  await test(secKey1, "Service Role Key 1");
  await test(secKey2, "Service Role Key 2");
}

run();
