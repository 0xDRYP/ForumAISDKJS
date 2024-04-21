import { ModelMarket } from '../src';
import { generateRandomPrivateKey } from '../src/utils';

const randomPrivateKey = generateRandomPrivateKey();

test(
  'Get hosts should return results',
  async () => {
    // Usage
    const model = new ModelMarket.Mixtral8x7BModelMarketTestnet(randomPrivateKey);
    const resp = await model.getHosts();
    expect(resp).toBeDefined();
    expect(resp.length).toBeGreaterThan(0);
  },
  60 * 1000
);
