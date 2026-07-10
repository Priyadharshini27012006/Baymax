const fs = require("fs");
const fileContent = fs.readFileSync("scratch/schema.json", "utf8");
const schema = JSON.parse(fileContent);

function printRpc(path) {
  console.log(`Path: ${path}`);
  const spec = schema.paths[path];
  if (!spec) {
    console.log("  Not found");
    return;
  }
  console.log("  Spec:", JSON.stringify(spec, null, 2));
}

printRpc("/rpc/get_employee_name_from_rfid");
printRpc("/rpc/toggle_rfid_status");
printRpc("/rpc/handle_rfid_scan");
