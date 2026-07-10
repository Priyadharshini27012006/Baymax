const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/graphql/v1";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function run() {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
          query {
            __schema {
              queryType {
                fields {
                  name
                  description
                }
              }
            }
          }
        `
      })
    });
    console.log("GraphQL Status:", res.status);
    const data = await res.json();
    console.log("GraphQL Schema fields:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
