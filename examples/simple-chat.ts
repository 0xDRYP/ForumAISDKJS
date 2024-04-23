// Please import from 'forumaisdk' if you have already installed
// import { ModelMarket } from 'forumaisdk';
import { ModelMarket } from '../src';

import * as readline from 'readline';

// Function to ask a question and wait for user input
const askQuestion = (question: string): Promise<string> => {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
};

const main = async () => {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Private key is not provided via env PRIVATE_KEY');
  }
  const model = new ModelMarket.Mixtral8x7BModelMarketTestnet(privateKey);
  const chat = [{ role: 'system', content: 'You are a helpful assistant!' }];

  while (true) {
    const prompt = await askQuestion('[INFO] Enter your prompt: ');
    if (['q', 'quit', 'exit'].includes(prompt)) {
      console.log('[INFO] Chat finished');
      break;
    }
    chat.push({ role: 'user', content: prompt });
    console.log('[INFO] Wait for response ...');
    const resp = await model.generate(3000, chat);
    console.log('[INFO] Response:\n', resp);
    chat.push({ role: 'assistant', content: resp });
  }
};

main().then();
