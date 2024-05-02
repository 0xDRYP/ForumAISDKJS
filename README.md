# ForumAI SDK

This is the Typescript implementation of ForumAI SDK

# Setup and usage

### Installation

This SDK is available on `npm` registry, so you can easily install it using `npm`, `yarn` or any other package manager
tool

```shell
npm install forumaisdk
```

### Usage

- With `cjs`

```javascript
const forumaisdk = require('forumaisdk');
const ModelMarket = forumaisdk.ModelMarket;
```

- With `esm`

```typescript
import { ModelMarket } from 'forumaisdk';
```

There is two modes of using the SDK to interact with the ForumAI LLM node:

1. No response streaming

   With this mode you will get response of your chat at once. Sample code looks like bellow

   ```typescript
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
   ```

   Full sample code you can found
   here [simple-chat](https://github.com/0xDRYP/ForumAISDKJS/tree/main/examples/simple-chat.ts)

2. Response streaming

   With this mode you will get response of your chat in stream. Sample code looks like bellow

   ```typescript
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
   ```

   Full sample code you can found
   here [streamed-chat](https://github.com/0xDRYP/ForumAISDKJS/tree/main/examples/streamed-chat.ts)
