import { config as dotenv } from "dotenv";
import { createWalletClient, http, publicActions } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { erc20Abi } from "viem";
import { CrossChainClient } from "./crossChainClient";
import {
  loadConfig,
  TOKEN_ADDRESSES,
  CHAIN_IDS,
  DEFAULT_ADDRESSES,
} from "./config";

dotenv({ quiet: true });

const configuration = loadConfig();

/**
 * Example: Base to Solana cross-chain swap
 * Swaps WETH on Base to USDC on Solana
 */
async function baseToSolanaExample() {
  console.log("🌉 Base to Solana Cross-Chain Swap Example");
  console.log("==========================================");

  const crossChainClient = new CrossChainClient(configuration.zeroexApiKey);

  // Setup wallet if private key is provided
  let account = null;
  let walletClient = null;
  let userAddress: string;

  if (configuration.evmPrivateKey) {
    account = privateKeyToAccount(configuration.evmPrivateKey as `0x${string}`);
    walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(configuration.rpcUrls.base),
    }).extend(publicActions);
    userAddress = account.address;
  } else {
    // Use default address for quote-only mode
    userAddress = DEFAULT_ADDRESSES.EVM;
    console.log("⚠️  No EVM_PRIVATE_KEY provided - running in quote-only mode");
  }

  const sellAmount = "1000000000000000"; // 0.001 WETH (18 decimals)

  // Get receiver address or use default
  const receiverAddress =
    configuration.solanaReceiverAddress || DEFAULT_ADDRESSES.SOLANA;

  // Safety check: if executing transactions, require explicit receiver address
  if (configuration.evmPrivateKey && !configuration.solanaReceiverAddress) {
    console.log(
      "❌ SAFETY: SOLANA_RECEIVER_ADDRESS must be set when executing transactions",
    );
    console.log(
      "This prevents accidentally sending funds to a default address",
    );
    console.log("Set SOLANA_RECEIVER_ADDRESS in your environment or .env file");
    return;
  }

  console.log(`👤 Sender (Base): ${userAddress}`);
  console.log(`🎯 Receiver (Solana): ${receiverAddress}`);

  try {
    // Step 1: Get the best quote
    console.log("\n📊 Getting cross-chain quote...");
    const quoteResponse = await crossChainClient.getQuote({
      originChain: CHAIN_IDS.base,
      destinationChain: CHAIN_IDS.solana,
      sellToken: TOKEN_ADDRESSES.WETH_BASE,
      buyToken: TOKEN_ADDRESSES.USDC_SOL,
      sellAmount,
      sortRoutesBy: "price",
      originAddress: userAddress,
      destinationAddress: receiverAddress,
      slippageBps: 100,
    });

    if (!quoteResponse.liquidityAvailable) {
      console.log("❌ No liquidity available");
      return;
    }

    const route = quoteResponse.route;
    console.log("✅ Quote received:");
    console.log(`  💰 Send: ${Number(route.sellAmount) / 1e18} WETH`);
    console.log(`  💱 Receive: ${Number(route.buyAmount) / 1e6} USDC`);
    console.log(`  🛡️ Min Receive: ${Number(route.minBuyAmount) / 1e6} USDC`);
    console.log(`  ⏱️ Estimated Time: ${route.estimatedTimeSeconds}s`);

    // Display route steps and bridge provider
    console.log(`  🔄 Steps: ${route.steps.length}`);
    const bridgeStep = route.steps.find((step) => step.type === "bridge");
    if (bridgeStep && bridgeStep.provider) {
      console.log(`  🌉 Bridge Provider: ${bridgeStep.provider}`);
    }

    route.steps.forEach((step, i) => {
      if (step.type === "bridge") {
        console.log(
          `    ${i + 1}. Bridge via ${step.provider} (${step.originChainId} → ${step.destinationChainId})`,
        );
      } else {
        console.log(`    ${i + 1}. Swap on chain ${step.chainId}`);
      }
    });

    // Check for balance issues first - skip everything if insufficient balance
    if (route.issues.balance) {
      console.log("❌ Insufficient balance detected");
      console.log(`  🔧 Token: ${route.issues.balance.token}`);
      console.log(`  💰 Required: ${route.issues.balance.expected}`);
      console.log(`  💰 Available: ${route.issues.balance.actual}`);
      console.log(
        "\n⚠️  Cannot proceed with transaction - insufficient balance",
      );
      return;
    }

    // Check for issues and handle allowance
    if (route.issues.allowance) {
      console.log("⚠️  Allowance issue detected - approval needed");
      console.log(`  📍 Spender: ${route.issues.allowance.spender}`);
      console.log(`  💰 Current allowance: ${route.issues.allowance.actual}`);

      if (walletClient) {
        console.log("\n🔧 Handling token approval...");

        console.log("📤 Sending approval transaction...");
        // Use the sell token address for approval
        const tokenAddress = TOKEN_ADDRESSES.WETH_BASE;
        const approveTxHash = await walletClient.writeContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [
            route.issues.allowance.spender as `0x${string}`,
            BigInt(sellAmount),
          ],
        });
        console.log(`📝 Approval sent: ${approveTxHash}`);

        console.log("⏳ Waiting for approval confirmation...");
        await walletClient.waitForTransactionReceipt({
          hash: approveTxHash,
          confirmations: 1,
        });
        console.log("✅ Approval confirmed");
        console.log(
          `🔗 View approval: https://basescan.org/tx/${approveTxHash}`,
        );
      }
    }

    // Step 2: Execute transaction (only if private key provided)
    if (route.transaction.chainType === "evm" && walletClient) {
      console.log("\n🚀 Executing transaction...");

      const txRequest = {
        to: route.transaction.details.to as `0x${string}`,
        data: route.transaction.details.data as `0x${string}`,
        value: BigInt(route.transaction.details.value),
        gas: route.transaction.details.gas
          ? BigInt(route.transaction.details.gas)
          : undefined,
      };

      console.log("📋 Transaction details:");
      console.log(`  📍 To: ${txRequest.to}`);
      console.log(`  💎 Value: ${txRequest.value} wei`);
      console.log(`  ⛽ Gas: ${txRequest.gas?.toString() || "estimated"}`);

      // Send transaction directly (API already simulated)
      console.log("📤 Sending transaction...");
      const txHash = await walletClient.sendTransaction(txRequest);
      console.log(`📝 Transaction sent: ${txHash}`);

      // Wait for confirmation
      console.log("⏳ Waiting for transaction confirmation...");
      const receipt = await walletClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 2,
      });
      console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
      console.log(`🔗 View on BaseScan: https://basescan.org/tx/${txHash}`);

      // Step 3: Monitor cross-chain transaction
      console.log("\n👀 Monitoring cross-chain transaction...");
      console.log("This may take several minutes...");

      try {
        const finalStatus = await crossChainClient.monitorTransaction(
          {
            originChain: CHAIN_IDS.base,
            originTxHash: txHash,
          },
          {
            maxAttempts: 120, // 10 minutes
            intervalMs: 5000,
            onUpdate: (status) => {
              const timestamp = new Date().toLocaleTimeString();
              console.log(
                `[${timestamp}] 📊 Status: ${status.status}${status.subStatus ? ` (${status.subStatus})` : ""}`,
              );

              if (status.transactions.length > 1) {
                console.log(
                  `🔗 ${status.transactions.length} transactions found:`,
                );
                status.transactions.forEach((tx, i) => {
                  const explorerUrl =
                    tx.chainId === 8453
                      ? `https://basescan.org/tx/${tx.txHash}`
                      : tx.chainId === 999999999991
                        ? `https://solscan.io/tx/${tx.txHash}`
                        : tx.txHash;
                  console.log(`  ${i + 1}. ${tx.chain}: ${explorerUrl}`);
                });
              }
            },
          },
        );

        console.log(`\n🏁 Final Status: ${finalStatus.status}`);

        if (
          finalStatus.status === "destination_tx_succeeded" ||
          finalStatus.status === "bridge_filled"
        ) {
          console.log("🎉 Cross-chain swap completed successfully!");
          console.log("\n📋 Final Transaction Summary:");
          finalStatus.transactions.forEach((tx, i) => {
            const date = new Date(tx.timestamp * 1000).toLocaleString();
            const explorerUrl =
              tx.chainId === 8453
                ? `https://basescan.org/tx/${tx.txHash}`
                : tx.chainId === 999999999991
                  ? `https://solscan.io/tx/${tx.txHash}`
                  : tx.txHash;
            console.log(`  ${i + 1}. ${tx.chain}: ${explorerUrl} (${date})`);
          });
        } else {
          console.log("❌ Cross-chain swap did not complete successfully");
          if (finalStatus.subStatus) {
            console.log(`   Reason: ${finalStatus.subStatus}`);
          }
        }
      } catch (monitorError) {
        console.error(
          "⚠️  Monitoring failed, but transaction may still succeed:",
          monitorError,
        );
        console.log(
          `You can manually check status at: https://basescan.org/tx/${txHash}`,
        );
      }
    } else if (route.transaction.chainType === "evm") {
      console.log("\n💡 Transaction ready for execution:");
      console.log(`  📍 To: ${route.transaction.details.to}`);
      console.log(`  💎 Value: ${route.transaction.details.value} wei`);
      console.log(
        `  📝 Data: ${route.transaction.details.data.slice(0, 20)}...`,
      );
      console.log(
        "\n💡 To execute this transaction, provide EVM_PRIVATE_KEY in your environment",
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

if (require.main === module) {
  baseToSolanaExample().catch(console.error);
}
