const h = {
  is_admin: 123,
  name: "Amrit",
};

const all = ["name"];

const result = Object.keys(h)
  .filter((key) => all.includes(key))
  .reduce((obj, val) => {
    obj[val] = h[val];
    return obj;
  }, {});

console.log(result);
