const levenshtein = (a, b) => {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

exports.calculateSimilarity = (domain1, domain2) => {
  const distance = levenshtein(domain1, domain2);
  const maxLength = Math.max(domain1.length, domain2.length);
  return 1 - (distance / maxLength);
};

exports.detectPhishingDomain = (domain, legitimateDomain) => {
  const similarity = exports.calculateSimilarity(domain, legitimateDomain);
  return {
    similarity: similarity,
    isPhishing: similarity > 0.8 && similarity < 0.99
  };
};
