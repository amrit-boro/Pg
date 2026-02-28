const h = {
  is_admin: 123,
  admin: "Amrit",
};

const all = ["is_admin"];

const result = Object.keys(h)
  .filter((key) => all.includes(key))
  .reduce((obj, val) => {
    obj[val] = h[val];
    return obj;
  }, {});

console.log(result, typeof result);
