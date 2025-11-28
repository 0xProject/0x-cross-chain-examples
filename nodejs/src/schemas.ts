import { z } from "zod";

// Cross-chain quotes request schema
export const CrossChainQuotesRequestSchema = z.object({
  originChain: z.union([z.string(), z.number()]),
  destinationChain: z.union([z.string(), z.number()]),
  sellToken: z.string(),
  buyToken: z.string(),
  sellAmount: z.string(),
  sortQuotesBy: z.enum(["speed", "price"]),
  originAddress: z.string(),
  destinationAddress: z.string().optional(),
  slippageBps: z.number().optional().default(100),
  excludedBridges: z.string().optional(),
  excludedSwapSources: z.string().optional(),
  feeRecipient: z.string().optional(),
  feeBps: z.string().optional(),
  feeToken: z.string().optional(),
  maxNumQuotes: z.number().min(1).max(10).optional().default(3),
  gasPayer: z.string().optional(),
});

export const FeeSchema = z
  .object({
    amount: z.string(),
    token: z.string(),
    type: z.enum(["volume", "native"]),
  })
  .nullable();

export const FeesSchema = z.object({
  integratorFees: z.array(FeeSchema),
  zeroExFee: FeeSchema,
  bridgeNativeFee: FeeSchema,
});

export const EvmGasCostsSchema = z.object({
  chainType: z.literal("evm"),
  gasPrice: z.string().nullable(),
  gasLimit: z.string(),
  totalNetworkFee: z.string().nullable(),
});

export const SvmGasCostsSchema = z.object({
  chainType: z.literal("svm"),
  base: z.string(),
  priority: z.string().nullable(),
  total: z.string(),
});

export const GasCostsSchema = z.union([EvmGasCostsSchema, SvmGasCostsSchema]);

export const SwapStepSchema = z.object({
  type: z.literal("swap"),
  chainId: z.number().optional(),
  sellToken: z.string(),
  buyToken: z.string(),
  sellAmount: z.string(),
  buyAmount: z.string(),
  minBuyAmount: z.string(),
  fees: FeesSchema.optional(),
  estimatedTimeSeconds: z.number(),
});

export const BridgeStepSchema = z.object({
  type: z.literal("bridge"),
  originChainId: z.number().optional(),
  destinationChainId: z.number().optional(),
  sellToken: z.string(),
  buyToken: z.string(),
  sellAmount: z.string(),
  buyAmount: z.string(),
  minBuyAmount: z.string(),
  provider: z.string().optional(),
  fees: FeesSchema.optional(),
  estimatedTimeSeconds: z.number(),
});

export const StepSchema = z.union([SwapStepSchema, BridgeStepSchema]);

export const EvmTransactionSchema = z.object({
  chainType: z.literal("evm"),
  details: z.object({
    to: z.string(),
    data: z.string(),
    gas: z.string().nullable(),
    gasPrice: z.string().nullable(),
    value: z.string(),
  }),
});

export const SvmTransactionSchema = z.object({
  chainType: z.literal("svm"),
  details: z.object({
    serializedTransaction: z.string(),
  }),
});

export const TransactionSchema = z.union([
  EvmTransactionSchema,
  SvmTransactionSchema,
]);

export const AllowanceIssueSchema = z
  .object({
    actual: z.string(),
    spender: z.string(),
  })
  .nullable();

export const BalanceIssueSchema = z
  .object({
    token: z.string(),
    actual: z.string(),
    expected: z.string(),
  })
  .nullable();

export const IssuesSchema = z.object({
  allowance: AllowanceIssueSchema,
  balance: BalanceIssueSchema,
  simulationIncomplete: z.boolean(),
  invalidSourcesPassed: z.array(z.string()).optional(),
  invalidBridgesPassed: z.array(z.string()).optional(),
});

export const QuoteSchema = z.object({
  sellAmount: z.string(),
  buyAmount: z.string(),
  minBuyAmount: z.string(),
  fees: FeesSchema,
  gasCosts: GasCostsSchema,
  steps: z.array(StepSchema),
  transaction: TransactionSchema,
  estimatedTimeSeconds: z.number(),
  issues: IssuesSchema,
  quoteId: z.string(),
});

export const CrossChainQuotesResponseSchema = z.union([
  z.object({
    liquidityAvailable: z.literal(true),
    allowanceTarget: z.string().nullable(),
    originChainId: z.number(),
    originChain: z.string(),
    destinationChainId: z.number(),
    destinationChain: z.string(),
    sellToken: z.string(),
    buyToken: z.string(),
    issues: IssuesSchema,
    zid: z.string(),
    routes: z.array(QuoteSchema).min(1).optional(),
    quotes: z.array(QuoteSchema).min(1),
  }),
  z.object({
    liquidityAvailable: z.literal(false),
    zid: z.string(),
  }),
]);

// Status schemas
export const TransactionInfoSchema = z.object({
  chainId: z.number(),
  chain: z.string(),
  txHash: z.string(),
  timestamp: z.number(),
});

export const CrossChainStatusRequestSchema = z.object({
  originChain: z.union([z.string(), z.number()]),
  originTxHash: z.string(),
});

export const CrossChainStatusResponseSchema = z.object({
  status: z.enum([
    "origin_tx_succeeded",
    "origin_tx_confirmed",
    "origin_tx_reverted",
    "bridge_pending",
    "bridge_delayed",
    "bridge_filled",
    "bridge_failed",
    "refund_pending",
    "refund_succeeded",
    "refund_failed",
    "destination_tx_pending",
    "destination_tx_confirmed",
    "destination_tx_reverted",
    "destination_tx_succeeded",
    "destination_tx_failed",
    "not_found",
    "unknown",
  ]),
  subStatus: z
    .enum([
      "insufficient_allowance",
      "insufficient_balance",
      "failed_simulation",
      "expired",
      "internal",
      "unknown",
    ])
    .optional(),
  bridge: z.string().optional(),
  transactions: z.array(TransactionInfoSchema),
  zid: z.string(),
});

export type CrossChainQuotesRequest = z.infer<
  typeof CrossChainQuotesRequestSchema
>;
export type CrossChainStatusRequest = z.infer<
  typeof CrossChainStatusRequestSchema
>;
export type CrossChainStatusResponse = z.infer<
  typeof CrossChainStatusResponseSchema
>;
export type CrossChainQuotesResponse = z.infer<
  typeof CrossChainQuotesResponseSchema
>;
export type Quote = z.infer<typeof QuoteSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type Issues = z.infer<typeof IssuesSchema>;
