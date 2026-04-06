newocc = [
  { type: "A", total: "10", price: 8000 },
  { type: "B", total: "5", price: 6000 },
];

const count = newocc?.reduce((acc, item) => {
  console.log("item: ", item.total);
  acc[item.type] = item.price;
  return acc;
}, {} || {});

console.log(count);
