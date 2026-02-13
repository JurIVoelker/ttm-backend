export const romanToInt = (s: string): number => {
  const romanNumerals: { [key: string]: number } = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
  };

  let total = 0;
  let prevValue = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const currentValue = romanNumerals[s[i].toUpperCase()];
    if (!currentValue) {
      throw new Error(`Invalid Roman numeral character: ${s[i]}`);
    };
    if (currentValue < prevValue) {
      total -= currentValue;
    } else {
      total += currentValue;
    }
    prevValue = currentValue;
  }
  return total;
}

export function intToRoman(num: number): string {
  if (num < 1 || num > 99) throw new RangeError('Number must be between 1 and 99');

  const romanNumerals: [number, string][] = [
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  let tens = Math.floor(num / 10) * 10;
  let ones = num % 10;

  // Handle tens
  if (tens > 0) {
    for (const [value, symbol] of romanNumerals) {
      while (tens >= value) {
        result += symbol;
        tens -= value;
      }
    }
  }

  // Handle ones
  for (const [value, symbol] of romanNumerals) {
    while (ones >= value) {
      result += symbol;
      ones -= value;
    }
  }

  return result;
}