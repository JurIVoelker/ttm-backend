export const dtoFromKeys = (obj: Record<string, any>, keys: string[]) => {
  const dto: Record<string, any> = {};
  keys.forEach((key) => {
    if (key in obj) {
      dto[key] = obj[key];
    }
  });

  return dto;
}