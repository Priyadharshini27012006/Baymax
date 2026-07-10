const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "sb_publishable_E3JndF7HEJDUhQuBa6qTww_-rCyzhpW";

async function queryTable(tableName) {
  try {
    const res = await fetch(`${url}${tableName}?select=*&limit=1`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    console.log(`Table: ${tableName}, Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`Data for ${tableName}:`, JSON.stringify(data, null, 2));
    } else {
      const txt = await res.text();
      console.log(`Error for ${tableName}:`, txt);
    }
  } catch (err) {
    console.error(`Error querying table ${tableName}:`, err);
  }
}

async function run() {
  await queryTable("machines");
  await queryTable("plc_data");
  await queryTable("operators");
  await queryTable("operator_mapping");
  await queryTable("operator_history");
  await queryTable("operator_mappings");
  await queryTable("operator_mapping_history");
}

run();
