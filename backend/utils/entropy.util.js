const crypto = require('crypto');

exports.calculateEntropy = (str) => {
  const entropy = {};
  for (let i = 0; i < str.length; i++) {
    entropy[str[i]] = (entropy[str[i]] || 0) + 1;
  }

  let shannonEntropy = 0;
  for (const char in entropy) {
    const p = entropy[char] / str.length;
    shannonEntropy -= p * Math.log2(p);
  }

  return shannonEntropy;
};

exports.normalizeUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + urlObj.pathname;
  } catch {
    return url.toLowerCase();
  }
};
