import { config as dotenv } from "dotenv";
import { Connection, VersionedTransaction, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
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
 * Example: Solana to Base cross-chain swap
 * Swaps WSOL on Solana to USDC on Base
 */
async function solanaToBaseExample() {
  console.log("🌉 Solana to Base Cross-Chain Swap Example");
  console.log("==========================================");

  const crossChainClient = new CrossChainClient(configuration.zeroexApiKey);

  // Setup Solana wallet if private key is provided
  let connection = null;
  let keypair = null;
  let userAddress: string;

  if (configuration.solanaPrivateKey) {
    connection = new Connection(configuration.rpcUrls.solana);
    const privateKeyArray = bs58.decode(configuration.solanaPrivateKey);
    keypair = Keypair.fromSecretKey(privateKeyArray);
    userAddress = keypair.publicKey.toBase58();
  } else {
    // Use default address for quote-only mode
    userAddress = DEFAULT_ADDRESSES.SOLANA;
    console.log(
      "⚠️  No SOLANA_PRIVATE_KEY provided - running in quote-only mode",
    );
  }

  const sellAmount = "1000000"; // 0.001 WSOL (9 decimals)

  // Get receiver address or use default
  const receiverAddress =
    configuration.evmReceiverAddress || DEFAULT_ADDRESSES.EVM;

  // Safety check: if executing transactions, require explicit receiver address
  if (configuration.solanaPrivateKey && !configuration.evmReceiverAddress) {
    console.log(
      "❌ SAFETY: EVM_RECEIVER_ADDRESS must be set when executing transactions",
    );
    console.log(
      "This prevents accidentally sending funds to a default address",
    );
    console.log("Set EVM_RECEIVER_ADDRESS in your environment or .env file");
    return;
  }

  console.log(`👤 Sender (Solana): ${userAddress}`);
  console.log(`🎯 Receiver (Base): ${receiverAddress}`);

  try {
    // Step 1: Get the best quote
    console.log("\n📊 Getting cross-chain quote...");
    const quoteResponse = await crossChainClient.getQuote({
      originChain: CHAIN_IDS.solana,
      destinationChain: CHAIN_IDS.base,
      sellToken: TOKEN_ADDRESSES.WSOL,
      buyToken: TOKEN_ADDRESSES.USDC_BASE,
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
    console.log(`  💰 Send: ${Number(route.sellAmount) / 1e9} WSOL`);
    console.log(`  💱 Receive: ${Number(route.buyAmount) / 1e6} USDC`);
    console.log(`  🛡️  Min Receive: ${Number(route.minBuyAmount) / 1e6} USDC`);
    console.log(`  ⏱️  Estimated Time: ${route.estimatedTimeSeconds}s`);

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

    // Display gas costs for Solana
    if (route.gasCosts.chainType === "svm") {
      console.log(`  ⛽ Solana Transaction Fees:`);
      console.log(`    🔹 Base Fee: ${Number(route.gasCosts.base) / 1e9} SOL`);
      console.log(
        `    🔸 Priority Fee: ${route.gasCosts.priority ? Number(route.gasCosts.priority) / 1e9 : 0} SOL`,
      );
      console.log(
        `    🔺 Total Fee: ${Number(route.gasCosts.total) / 1e9} SOL`,
      );
    }

    // Step 2: Execute transaction (only if private key provided)
    if (route.transaction.chainType === "svm" && keypair && connection) {
      console.log("\n🚀 Executing transaction...");

      const serializedTx = route.transaction.details.serializedTransaction;
      const transactionBuffer = Buffer.from(serializedTx, "base64");
      const transaction = VersionedTransaction.deserialize(transactionBuffer);

      console.log("📋 Transaction details:");
      console.log(
        `  📝 Instructions: ${transaction.message.compiledInstructions.length}`,
      );
      console.log(
        `  🔑 Required signatures: ${transaction.message.header.numRequiredSignatures}`,
      );

      // Sign transaction
      console.log("✍️  Signing transaction...");
      transaction.sign([keypair]);

      // Send transaction (API already validated it)
      console.log("📤 Sending transaction...");
      const signature = await connection.sendTransaction(transaction, {
        skipPreflight: false, // Let Solana do final preflight
        preflightCommitment: "confirmed",
      });
      console.log(`📝 Transaction sent: ${signature}`);

      // Wait for confirmation
      console.log("⏳ Waiting for transaction confirmation...");
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          ...(await connection.getLatestBlockhash()),
        },
        "finalized",
      );

      if (confirmation.value.err) {
        console.error(
          `❌ Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        );
        return;
      }

      console.log(`✅ Transaction confirmed`);
      console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);

      // Step 3: Monitor cross-chain transaction
      console.log("\n👀 Monitoring cross-chain transaction...");
      console.log("This may take several minutes...");

      try {
        const finalStatus = await crossChainClient.monitorTransaction(
          {
            originChain: CHAIN_IDS.solana,
            originTxHash: signature,
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
          `You can manually check status at: https://solscan.io/tx/${signature}`,
        );
      }
    } else if (route.transaction.chainType === "svm") {
      console.log(
        "\n💡 To execute this transaction, provide SOLANA_PRIVATE_KEY in your environment",
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

if (require.main === module) {
  solanaToBaseExample().catch(console.error);
}
