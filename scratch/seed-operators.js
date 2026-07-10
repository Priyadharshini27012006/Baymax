const url = "https://nubtbbzfbszwcmsrxhva.supabase.co/rest/v1/";
const key = "YOUR_SUPABASE_SERVICE_ROLE_KEY";

async function seedOperators() {
  const operators = [
    { Operator_ID: "EMP-101", operator_name: "John Doe", shift: "Shift A", uid: "50C06F1E" },
    { Operator_ID: "EMP-102", operator_name: "Jane Smith", shift: "Shift B", uid: "73793706" },
    { Operator_ID: "EMP-103", operator_name: "Mike Johnson", shift: "Shift C", uid: "459AF605" },
    { Operator_ID: "EMP-104", operator_name: "Sarah Williams", shift: "Shift A", uid: "7A42F505" }
  ];

  try {
    const res = await fetch(`${url}operators`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify(operators)
    });
    console.log("Seed operators status:", res.status);
    if (!res.ok) {
      console.log("Error response:", await res.text());
    }
  } catch (err) {
    console.error(err);
  }
}

seedOperators();
