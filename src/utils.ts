// Generate a random private key
export const generateRandomPrivateKey = () => {
  let privateKey = '0x';
  for (let i = 0; i < 32; i++) {
    const randomByte = Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
    privateKey += randomByte;
  }
  return privateKey;
};
