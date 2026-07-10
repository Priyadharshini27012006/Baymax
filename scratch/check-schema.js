const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "sb_publishable_E3JndF7HEJDUhQuBa6qTww_-rCyzhpW";

async function querySchema() {
  try {
    // We can query the RPC if there is one, or try querying information_schema.columns
    const res = await fetch(`${url}rpc/get_schema_info`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      }
    });
    console.log(`RPC get_schema_info status: ${res.status}`);
    console.log(await res.text());
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await querySchema();
}

run();
