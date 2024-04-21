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

const sleep = (milliseconds: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
};

const logWithoutEndLine = (message: string) => {
  process.stdout.write(message);
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

    const [node_url, result_code] = await model.generateSelfRequesting(3000, chat);
    let full_resp = '';
    let done = false;
    console.log('[INFO] Response:\n');
    while (!done) {
      const [resp, _done] = await model.getNextOutput(node_url, result_code, full_resp);
      full_resp += resp;
      done = _done;
      logWithoutEndLine(resp);
      await sleep(100);
    }
    logWithoutEndLine('\n');
    chat.push({ role: 'assistant', content: full_resp });
  }
};

main().then();
