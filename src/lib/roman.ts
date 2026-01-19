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

// export const orderRomanArray = <T>(array: T[], key: keyof T): T[] => {
//   return (array as unknown as T[]).sort((a, b) => {
//     const romanA = a[key] as unknown as string;
//     const romanB = b[key] as unknown as string;
//     return romanToInt(romanA) - romanToInt(romanB);
//   });
// }

// export const getTeamIndex = (teamName: string): number => {
//   const romanPart = teamName.split(" ").pop() || "";
//   return romanToInt(romanPart);
// }