import { useState, useCallback } from 'react';

export enum TxStep {
  IDLE,
  PREPARING,
  AWAITING_SIGNATURE,
  SUBMITTING,
  CONFIRMING,
  SUCCESS,
  ERROR
}

export function useSorobanTx() {
  const [step, setStep] = useState<TxStep>(TxStep.IDLE);
  const [error, setError] = useState<string | null>(null);

  const executeTx = useCallback(async (txFunction: () => Promise<unknown>) => {
    try {
      setError(null);
      
      // 1. Preparing Transaction
      setStep(TxStep.PREPARING);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 2. Awaiting Wallet Signature
      setStep(TxStep.AWAITING_SIGNATURE);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Submitting to Soroban
      setStep(TxStep.SUBMITTING);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 4. Confirming Ledger Settlement
      setStep(TxStep.CONFIRMING);
      await txFunction();
      
      setStep(TxStep.SUCCESS);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStep(TxStep.ERROR);
    }
  }, []);

  const reset = useCallback(() => {
    setStep(TxStep.IDLE);
    setError(null);
  }, []);

  return { step, error, executeTx, reset };
}
