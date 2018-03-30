const Token = (type, amount) => {
  const t = parseInt(type);
  // Value should be string to avoid precision errors.
  const value = amount+'';
  return Object.freeze({
    getType: () => {
      return t;
    },
    getAmount: () => {
      return value;
    }
  });
};

exports.create = (type, amount) => {
  return Token(type, amount);
};

exports.ETH = 1;