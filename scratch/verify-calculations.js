const { createClient } = require("@supabase/supabase-js");

const url = "https://nubtbbzfbszwcmsrxhva.supabase.co";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";
const supabase = createClient(url, key);

const THRESHOLD_MS = 10 * 1000;

async function run() {
  try {
    console.log("Loading all PLC records...");
    let allRows = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("plc_data")
        .select("*")
        .order("created_at", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) {
        console.error("DB error:", error);
        break;
      }
      if (!data || data.length === 0) break;
      allRows = [...allRows, ...data];
      if (data.length < pageSize) break;
      page++;
    }

    console.log(`Total PLC records loaded: ${allRows.length}`);

    let lastProcessedTimestamp = 0;
    let accumulatedRuntimeMs = 0;
    let accumulatedActualCount = 0;
    let cycleStartTimestamp = null;
    let prevDi7 = undefined;
    let prevDi12 = undefined;

    let lastCycleTime = 0;

    for (const row of allRows) {
      if (row.id === 1) continue; // skip configuration row
      const rowTime = new Date(row.created_at).getTime();
      
      // Runtime
      if (lastProcessedTimestamp > 0) {
        const diff = rowTime - lastProcessedTimestamp;
        if (diff > 0 && diff <= THRESHOLD_MS) {
          accumulatedRuntimeMs += diff;
        }
      }
      lastProcessedTimestamp = rowTime;

      // Actual count and cycle duration
      const currentDi7 = Number(row.di7);
      const currentDi12 = Number(row.di12);

      if (prevDi7 !== undefined && prevDi12 !== undefined) {
        if (prevDi7 === 1 && currentDi7 === 0) {
          if (cycleStartTimestamp === null) {
            cycleStartTimestamp = rowTime;
          }
        }
        if (prevDi12 === 0 && currentDi12 === 1) {
          if (cycleStartTimestamp !== null) {
            accumulatedActualCount += 1;
            lastCycleTime = (rowTime - cycleStartTimestamp) / 1000;
            cycleStartTimestamp = null;
          }
        }
      }

      prevDi7 = currentDi7;
      prevDi12 = currentDi12;
    }

    console.log("--- Calculation Results ---");
    console.log(`Calculated Runtime: ${accumulatedRuntimeMs / 60000} minutes (${accumulatedRuntimeMs / 1000} seconds)`);
    console.log(`Calculated Actual Count: ${accumulatedActualCount}`);
    console.log(`Latest Completed Cycle Duration: ${lastCycleTime} seconds`);
  } catch (err) {
    console.error("Test error:", err);
  }
}

run();
