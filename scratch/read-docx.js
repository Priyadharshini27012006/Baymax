const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

async function run() {
  try {
    const docxPath = "C:\\Users\\PRIYA\\Downloads\\SmartFactoryOEE_React_Conversion_Guide.docx";
    const zipPath = "c:\\Users\\PRIYA\\Desktop\\antigravity\\scratch\\temp_doc.zip";
    const destDir = "c:\\Users\\PRIYA\\Desktop\\antigravity\\scratch\\docx_extract";
    
    // Copy to .zip
    fs.copyFileSync(docxPath, zipPath);
    
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Extract using powershell since it has Expand-Archive
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`);
    
    const docXmlPath = path.join(destDir, "word", "document.xml");
    if (fs.existsSync(docXmlPath)) {
      const xml = fs.readFileSync(docXmlPath, "utf8");
      // Remove XML tags to get raw text
      const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      fs.writeFileSync("scratch/doc-text.txt", text, "utf8");
      console.log("Successfully extracted text of length:", text.length);
      // Search for SQL or function names in the extracted text
      const searchTerms = ["handle_rfid_scan", "rfid_login", "toggle_rfid_status", "get_employee_name_from_rfid", "CREATE OR REPLACE FUNCTION"];
      for (const term of searchTerms) {
        const index = text.indexOf(term);
        if (index !== -1) {
          console.log(`Found term '${term}' at index ${index}. Snippet:`);
          console.log(text.substring(Math.max(0, index - 200), Math.min(text.length, index + term.length + 200)));
          console.log("------------------------");
        } else {
          console.log(`Term '${term}' not found`);
        }
      }
    } else {
      console.log("Could not find word/document.xml in docx");
    }
    
    // Clean up temp zip
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  } catch (err) {
    console.error(err);
  }
}

run();
