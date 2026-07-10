const fs = require("fs");

try {
  const fileContent = fs.readFileSync("scratch/schema.json", "utf8");
  // Clean up any potential console log output before the JSON
  const jsonStartIndex = fileContent.indexOf("{");
  if (jsonStartIndex === -1) {
    throw new Error("No JSON object found in output");
  }
  const jsonString = fileContent.substring(jsonStartIndex);
  const schema = JSON.parse(jsonString);

  console.log("TABLES DEFINED:");
  if (schema.definitions) {
    for (const tableName of Object.keys(schema.definitions)) {
      const def = schema.definitions[tableName];
      const cols = Object.keys(def.properties || {});
      console.log(`- Table: ${tableName}`);
      console.log(`  Columns: ${cols.join(", ")}`);
    }
  }

  console.log("\nRPCS DEFINED:");
  if (schema.paths) {
    for (const path of Object.keys(schema.paths)) {
      if (path.startsWith("/rpc/")) {
        console.log(`- RPC: ${path}`);
        const post = schema.paths[path].post;
        if (post && post.parameters) {
          const bodyParam = post.parameters.find(p => p.in === "body");
          if (bodyParam && bodyParam.schema && bodyParam.schema.$ref) {
            const refName = bodyParam.schema.$ref.split("/").pop();
            const refDef = schema.definitions[refName];
            if (refDef) {
              console.log(`  Parameters:`, Object.keys(refDef.properties || {}).join(", "));
            }
          } else if (post.parameters) {
            console.log(`  Parameters:`, post.parameters.map(p => p.name).join(", "));
          }
        }
      }
    }
  }
} catch (err) {
  console.error("Error parsing schema:", err);
}
