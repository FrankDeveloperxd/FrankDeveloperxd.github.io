const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "abcdefghijklmnopqrstuvwxyz" +
  "0123456789" +
  "!@#$%&*+-_=.?";

export function generatePassword(length = 24) {
  if (!Number.isInteger(length) || length < 12 || length > 128) {
    throw new Error("Longitud de contraseña inválida.");
  }

  const limit = 256 - (256 % ALPHABET.length);
  let result = "";

  while (result.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));

    for (const byte of bytes) {
      if (byte >= limit) continue;

      result += ALPHABET[byte % ALPHABET.length];

      if (result.length === length) break;
    }
  }

  return result;
}