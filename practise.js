function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fet() {
  try {
    const result = await fetch("http://localhost:8000/api/v1/pg/getAllPgRoom");
    const user = await result.json();

    await delay(2000); // 2 second delay

    console.log(user);
  } catch (err) {
    console.error(err.message);
  }
}

fet();
