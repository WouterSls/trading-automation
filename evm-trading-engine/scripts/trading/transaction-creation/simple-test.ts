async function createTransaction() {
  console.log("test");
}

if (require.main === module) {
  createTransaction().catch(console.error);
}
