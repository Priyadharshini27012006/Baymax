const { createClient } = require("@supabase/supabase-js");

const url = "https://nubtbbzfbszwcmsrxhva.supabase.co";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";
const supabase = createClient(url, key);

async function run() {
  console.log("Subscribing to realtime channels...");
  const channel = supabase.channel("test-all-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "machines" },
      (p) => console.log("Event machines:", p)
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "plc_data" },
      (p) => console.log("Event plc_data:", p)
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rfid_logs" },
      (p) => console.log("Event rfid_logs:", p)
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "operators" },
      (p) => console.log("Event operators:", p)
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "alerts" },
      (p) => console.log("Event alerts:", p)
    )
    .subscribe((status) => {
      console.log("Subscription status:", status);
    });

  // Keep running for 8 seconds, and trigger an update to machines table to see if we get it
  setTimeout(async () => {
    console.log("Triggering test update on machines...");
    const { error } = await supabase.from("machines").update({ part_number: "PN-TEST" }).eq("id", 2);
    if (error) console.error("Update error:", error);
    else console.log("Update success!");
  }, 2000);

  setTimeout(() => {
    console.log("Exiting...");
    process.exit(0);
  }, 8000);
}

run();
