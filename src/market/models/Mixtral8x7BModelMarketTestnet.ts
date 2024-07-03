import {
  TESTNET_LLM_MARKET_CONTRACT_ADDRESS,
  TESTNET_RPC_ENDPOINT,
  TESTNET_USDC_TOKEN_CONTRACT_ADDRESS,
} from '../../contants';
import { abi as USDC_ABI } from '../../abi/USDC.json';
import { abi as LLM_MARKET_ABI } from '../../abi/LLMMarket.json';
import { Contract, Web3, Web3BaseWalletAccount } from 'web3';
import { ChatMessage, HostInfo } from '../types';
import axios from 'axios';
import { get_encoding, TiktokenEncoding } from 'tiktoken';

export class Mixtral8x7BModelMarketTestnet {
  private account: Web3BaseWalletAccount;
  private rpcEndpoint: string;
  private web3: Web3;
  private llmMarketContractAddress: string;
  private currencyTokenContractAddress: string;
  private llmMarketContract: Contract<[]>;
  private currencyTokenContract: Contract<[]>;

  constructor(
    privateKey: string,
    rpcEndpoint: string = TESTNET_RPC_ENDPOINT,
    llmMarketContractAddress: string = TESTNET_LLM_MARKET_CONTRACT_ADDRESS,
    currencyTokenContractAddress: string = TESTNET_USDC_TOKEN_CONTRACT_ADDRESS,
    llmMarketContractAbi = LLM_MARKET_ABI,
    currencyTokenContractAbi = USDC_ABI
  ) {
    this.rpcEndpoint = rpcEndpoint;
    this.llmMarketContractAddress = llmMarketContractAddress;
    this.currencyTokenContractAddress = currencyTokenContractAddress;

    this.web3 = new Web3(rpcEndpoint);
    this.account = this.web3.eth.accounts.wallet.add(
      privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
    )[0];
    this.llmMarketContract = new this.web3.eth.Contract(
      llmMarketContractAbi,
      llmMarketContractAddress
    );
    this.currencyTokenContract = new this.web3.eth.Contract(
      currencyTokenContractAbi,
      currencyTokenContractAddress
    );
  }

  /**
   * Return list of available LLM hosts
   */
  async getHosts(): Promise<HostInfo[]> {
    return this.llmMarketContract.methods.getHosts().call();
  }

  /**
   * Check if the host is pausing or not
   * @param hostAddress address of host account
   */

  async getPaused(hostAddress: string): Promise<boolean> {
    return this.llmMarketContract.methods.getPaused(hostAddress).call();
  }

  /**
   * Get balance of currency token using for payment
   * @param address address oof account to check balance
   */
  async getTokenBalance(address: string): Promise<number> {
    return this.currencyTokenContract.methods.balanceOf(address).call();
  }

  /**
   * Mint to currency token for the requester (testnet only)
   */
  async mintToken() {
    const txReceipt = await this.currencyTokenContract.methods.mint(BigInt(5 * 10 ** 18)).send({
      from: this.account.address,
      gasPrice: (await this.web3.eth.getGasPrice()).toString(),
    });
    const allowance: bigint = await this.currencyTokenContract.methods
      .allowance(this.account.address, this.llmMarketContract.options.address)
      .call();
    if (allowance < 5 * 10 ** 6) {
      await this.approveCurrencyTokenForLmmMarket();
    }
    return txReceipt;
  }

  /**
   * Add request to the smart contract on chain
   * @param uniqueCode code to be added on chain
   * @param hostAddress host account address
   * @param value value will be spent for requesting chat response
   */

  async addRequestOnChain(uniqueCode: number, hostAddress: string, value: bigint) {
    const allowance: bigint = await this.currencyTokenContract.methods
      .allowance(this.account.address, this.llmMarketContract.options.address)
      .call();
    if (allowance < value) {
      await this.approveCurrencyTokenForLmmMarket();
    }
    return this.llmMarketContract.methods.addRequest(uniqueCode, hostAddress, value).send({
      from: this.account.address,
      gasPrice: (await this.web3.eth.getGasPrice()).toString(),
    });
  }

  private async approveCurrencyTokenForLmmMarket() {
    await this.currencyTokenContract.methods
      .approve(
        this.llmMarketContract.options.address,
        await this.currencyTokenContract.methods.balanceOf(this.account.address).call()
      )
      .send({
        from: this.account.address,
        gasPrice: (await this.web3.eth.getGasPrice()).toString(),
      });
  }

  /**
   * Generate a unique code in number format
   */
  static generateUniqueCode(): number {
    let uniqueCode = '';
    for (let i = 0; i < 5; i++) {
      uniqueCode += Math.floor(Math.random() * 16).toString(16);
    }
    return parseInt(uniqueCode, 16);
  }

  /**
   * Initialize the chat to the node
   * @param chat list [{"role": "user", "content": "Lorem ipsum"}, ...], represents the input chat
   * @param nodeUrl url of the node
   * @param uniqueCode the unique code which have been registered on chain
   */
  static async createCompletion(
    chat: ChatMessage[],
    nodeUrl: string,
    uniqueCode: number
  ): Promise<string> {
    const data = {
      unique_code: uniqueCode,
      messages: chat,
    };

    const response = await axios.post(nodeUrl + 'ai/create/', data);
    return response.data.result;
  }

  /**
   * Get the response of the chat corresponding to the chat code
   * @param nodeUrl url of node
   * @param resultCode code of the chat
   */
  static async getCompletion(nodeUrl: string, resultCode: string): Promise<string> {
    const response = await axios.get(nodeUrl + 'ai/get/' + resultCode);
    return response.data.content;
  }

  /**
   * Return number of tokens used for encode the string
   * @param str the string
   * @param encodingName encoding method name
   */
  static numTokensFromString(str: string, encodingName: TiktokenEncoding): bigint {
    const encoding = get_encoding(encodingName);
    const tokens = encoding.encode(str);
    return BigInt(tokens.length);
  }

  /**
   * Generates AI response based on the chat and with max total_output_tokens tokens.
   * @param totalOutputTokens max number of output tokens of AI response, also influences max number of input chars
   * @param chat list [{"role": "user", "content": "Lorem ipsum"}, ...], represents the input chat
   * @return string - generated output
   */
  async generate(totalOutputTokens: number, chat: ChatMessage[]): Promise<string> {
    const [nodeUrl, resultCode] = await this.generateSelfRequesting(totalOutputTokens, chat);

    let resp = '';
    let c = 0;
    while (resp.length < 10 || !resp.endsWith('<e>')) {
      resp = await Mixtral8x7BModelMarketTestnet.getCompletion(nodeUrl, resultCode);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
      c += 1;
      if (c === 50) {
        return 'Timeout!';
      }
    }

    return resp.slice(3, -3);
  }

  /**
   * Requests an AI response based on the chat and with max total_output_tokens tokens.
   * @param totalOutputTokens max number of output tokens of AI response, also influences max number of input chars
   * @param chat list [{"role": "user", "content": "Lorem ipsum"}, ...], represents the input chat
   * @return [string, string] - node url, result code
   */
  async generateSelfRequesting(
    totalOutputTokens: number,
    chat: ChatMessage[]
  ): Promise<[string, string] | string> {
    let node: HostInfo | null = null;
    let count = 0;
    while (!node) {
      const tempHosts = await this.getHosts();
      const temp = tempHosts[Math.floor(Math.random() * tempHosts.length)];
      if (!(await this.getPaused(temp.hostAccount))) {
        node = temp;
      }
      count += 1;
      if (count > 100) {
        return 'No nodes active, try again later!';
      }
    }

    const uniqueCode = Mixtral8x7BModelMarketTestnet.generateUniqueCode();
    const resultCode = await Mixtral8x7BModelMarketTestnet.createCompletion(
      chat,
      node.url,
      uniqueCode
    );

    let inp = '';
    for (const message of chat) {
      inp += message.content;
    }
    const value =
      node.price *
      (BigInt(totalOutputTokens) +
        (Mixtral8x7BModelMarketTestnet.numTokensFromString(inp, 'cl100k_base') +
          BigInt(chat.length) * BigInt(4)));
    if ((await this.getTokenBalance(this.account.address)) < value) {
      await this.mintToken();
    }

    await this.addRequestOnChain(uniqueCode, node.hostAccount, value);

    return [node.url, resultCode];
  }

  /**
   * Returns the next part of the output that has been generated by now
   *
   * @param nodeUrl url of the node that handles the API request
   * @param resultCode unique code that allows to access the response
   * @param oldOutput output that has been generated until now
   * @return [string, bool] - next part of the output, shows if the generation is finished
   */
  async getNextOutput(
    nodeUrl: string,
    resultCode: string,
    oldOutput: string
  ): Promise<[string, boolean]> {
    let done = false;
    let resp = await Mixtral8x7BModelMarketTestnet.getCompletion(nodeUrl, resultCode);
    resp = resp.slice(oldOutput.length + 3);
    if (resp.endsWith('<e>')) {
      resp = resp.slice(0, -3);
      done = true;
    }
    return [resp, done];
  }
}
