import React, { useEffect, useState } from 'react';
import { TxStep } from '@/hooks/useSorobanTx';

interface TxProgressStepperProps {
  step: TxStep;
  error: string | null;
  onClose: () => void;
}

export const TxProgressStepper: React.FC<TxProgressStepperProps> = ({ step, error, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (step !== TxStep.IDLE) {
      setIsOpen(true);
    }
    
    // Auto-close modal only after step 4 completes successfully (SUCCESS is after CONFIRMING)
    if (step === TxStep.SUCCESS) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, onClose]);

  if (!isOpen) return null;

  const steps = [
    { label: '1. Preparing Transaction', txStep: TxStep.PREPARING },
    { label: '2. Awaiting Wallet Signature', txStep: TxStep.AWAITING_SIGNATURE },
    { label: '3. Submitting to Soroban', txStep: TxStep.SUBMITTING },
    { label: '4. Confirming Ledger Settlement', txStep: TxStep.CONFIRMING },
  ];

  const getCurrentStepIndex = () => {
    if (step === TxStep.IDLE) return -1;
    if (step === TxStep.SUCCESS) return 4;
    if (step === TxStep.ERROR) return -1;
    return step - 1; // Assuming PREPARING is 1, AWAITING is 2, etc.
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Transaction Progress</h3>
        
        {error ? (
          <div className="text-red-500 mb-4">
            <p>Error: {error}</p>
            <button 
              onClick={() => { setIsOpen(false); onClose(); }}
              className="mt-4 w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((s, idx) => {
              const isCompleted = currentIndex > idx;
              const isCurrent = currentIndex === idx;
              
              return (
                <div key={idx} className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm
                    ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}
                  >
                    {isCompleted ? '✓' : (idx + 1)}
                  </div>
                  <span className={`${isCurrent ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
            
            {step === TxStep.SUCCESS && (
              <div className="mt-6 text-green-500 font-medium text-center">
                Transaction Successful!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
