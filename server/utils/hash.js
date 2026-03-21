const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const SALT_ROUNDS = 10;

exports.hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

exports.comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

exports.generateResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return { rawToken, hashedToken };
};
