"use client";

import React, { useState } from 'react';
import { X, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useWallet } from '@/providers/WalletProvider';

/** Minimum native XLM kept aside for Stellar transaction fees. */
const MIN_XLM_FOR_FEES = 1;
/** Platform service fee as a percentage of the session amount. */
const PLATFORM_FEE_PERCENT = 0.02;

interface FundSessionModalProps {
  expertName: string;
  expertHourlyRate: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (sessionId: string) => void;
}

type Step = 'duration' | 'confirm' | 'success';

export default function FundSessionModal({
  expertName,
  expertHourlyRate,
  isOpen,
  onClose,
  onSuccess,
}: FundSessionModalProps) {
  const { balance, address, isLoading, error } = useWallet();
  const [currentStep, setCurrentStep] = useState<Step>('duration');
  const [duration, setDuration] = useState<number>(60); // minutes
  const [isProcessing, setIsProcessing] = useState(false);
  const [rentFee, setRentFee] = useState<number | null>(null);
  const [isEstimatingRent, setIsEstimatingRent] = useState(false);

  const hourlyRate = parseInt(expertHourlyRate?.replace(/\D/g, '') || '50');
  const depositAmount = (hourlyRate * duration) / 60;
  const platformFee = depositAmount * PLATFORM_FEE_PERCENT;
  const gasFee = rentFee ?? 0;
  const totalAmount = depositAmount + gasFee + platformFee;
  const sessionId = `SESSION_${Date.now()}`;

  // Simulate RPC call for state rent
  const fetchRentEstimate = async () => {
    setIsEstimatingRent(true);
    try {
      // Dummy RPC dry-run simulation
      await new Promise((resolve) => setTimeout(resolve, 800));
      setRentFee(0.015); // Mock rent fee in XLM
    } catch (e) {
      console.error("Failed to estimate rent fee", e);
      setRentFee(0.01); // Fallback mock fee
    } finally {
      setIsEstimatingRent(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchRentEstimate();
    }
  }, [isOpen, duration]);

  const walletBalance = balance !== null ? parseFloat(balance) : null;
  const totalRequired = totalAmount + MIN_XLM_FOR_FEES;
  
  const isBalanceUnavailable =
    isLoading ||
    error !== null ||
    !address ||
    walletBalance === null ||
    Number.isNaN(walletBalance);
  const hasInsufficientBalance =
    !isBalanceUnavailable && walletBalance < totalRequired;
  const cannotProceed = isBalanceUnavailable || hasInsufficientBalance || isEstimatingRent;

  const handleDurationChange = (value: number) => {
    setDuration(value);
  };

  const handleConfirm = async () => {
    if (cannotProceed) return;

    setIsProcessing(true);
    // Simulate wallet transaction
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setCurrentStep('success');

    // Trigger success callback after 2 seconds
    setTimeout(() => {
      onSuccess?.(sessionId);
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  const insufficientBalanceBanner = hasInsufficientBalance ? (
    <div
      role="alert"
      className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4"
    >
      <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-200">
        Insufficient XLM for transaction fees
      </p>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl shadow-2xl max-w-md w-full relative">
        {/* Close Button */}
        {currentStep !== 'success' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-purple-500/20 rounded-lg transition-all"
          >
            <X size={24} />
          </button>
        )}

        {/* Header */}
        <div className="p-6 border-b border-purple-500/20">
          <h2 className="text-2xl font-bold">Fund Your Session</h2>
          <p className="text-sm text-muted-foreground mt-2">with {expertName}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'duration' && (
            <div className="space-y-6">
              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-semibold mb-4">
                  Session Duration
                </label>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[30, 60, 90].map((min) => (
                    <button
                      key={min}
                      onClick={() => handleDurationChange(min)}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        duration === min
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'bg-purple-600/10 border border-purple-500/30 hover:border-purple-500/60'
                      }`}
                    >
                      {min} min
                    </button>
                  ))}
                </div>

                {/* Custom Duration */}
                <label className="text-xs text-muted-foreground mb-2 block">Custom Duration (minutes)</label>
                <input
                  type="number"
                  min="15"
                  max="240"
                  step="15"
                  value={duration}
                  onChange={(e) => handleDurationChange(parseInt(e.target.value) || 60)}
                  className="w-full px-4 py-2 bg-purple-600/10 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500/60"
                />
              </div>

              {/* Detailed Fee Breakdown */}
              <div className="bg-purple-600/10 border border-purple-500/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-white mb-3">Fee Breakdown</h4>
                <table className="w-full text-sm">
                  <tbody className="space-y-2">
                    <tr className="flex justify-between py-1.5">
                      <td className="text-muted-foreground">Initial Deposit</td>
                      <td className="font-medium text-white">
                        {depositAmount.toFixed(2)} XLM
                      </td>
                    </tr>
                    <tr className="flex justify-between py-1.5">
                      <td className="text-muted-foreground">Estimated Soroban Gas</td>
                      <td className="font-medium text-amber-400">
                        {isEstimatingRent
                          ? 'Estimating...'
                          : gasFee > 0
                            ? `${gasFee.toFixed(3)} XLM`
                            : '0 XLM'}
                      </td>
                    </tr>
                    <tr className="flex justify-between py-1.5">
                      <td className="text-muted-foreground">
                        Platform Service Fee
                        <span className="text-xs ml-1 text-purple-400">(2%)</span>
                      </td>
                      <td className="font-medium text-purple-400">
                        {platformFee.toFixed(3)} XLM
                      </td>
                    </tr>
                    <tr className="flex justify-between pt-3 mt-2 border-t border-purple-500/20 font-bold">
                      <td className="text-white">Total Amount to Lock</td>
                      <td className="text-purple-400">
                        {totalAmount.toFixed(3)} XLM
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {insufficientBalanceBanner}

              {/* Next Button */}
              <button
                onClick={() => setCurrentStep('confirm')}
                disabled={cannotProceed}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-600/50 disabled:to-pink-600/50 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {isEstimatingRent ? 'Estimating Rent...' : 'Continue'}
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {currentStep === 'confirm' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Expert</span>
                  <span className="font-semibold">{expertName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-semibold">{duration} minutes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Estimated Soroban Gas</span>
                  <span className="font-semibold">{gasFee > 0 ? `${gasFee.toFixed(3)} XLM` : '0 XLM'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Platform Service Fee (2%)</span>
                  <span className="font-semibold text-purple-400">{platformFee.toFixed(3)} XLM</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-purple-500/20">
                  <span className="text-gray-400">Total Amount</span>
                  <span className="font-semibold text-lg text-purple-400">{totalAmount.toFixed(3)} XLM</span>
                </div>
              </div>

              {insufficientBalanceBanner}

              {/* Wallet Info */}
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  You will be prompted to confirm this transaction via Freighter Wallet.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing || cannotProceed}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-600/50 disabled:to-pink-600/50 rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Confirm & Pay'}
                </button>
                <button
                  onClick={() => setCurrentStep('duration')}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 bg-purple-600/10 border border-purple-500/30 hover:border-purple-500/60 rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {currentStep === 'success' && (
            <div className="text-center space-y-6">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/30 rounded-full blur-lg animate-pulse"></div>
                  <div className="relative bg-green-500/20 border border-green-500/50 rounded-full p-4">
                    <CheckCircle size={40} className="text-green-400" />
                  </div>
                </div>
              </div>

              {/* Success Message */}
              <div>
                <h3 className="text-2xl font-bold mb-2">Session Funded!</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  ${depositAmount.toFixed(2)} XLM has been escrowed for your session with {expertName}
                </p>
                <div className="bg-purple-600/10 border border-purple-500/20 rounded-lg p-3 text-xs">
                  <p>Session ID: <span className="font-mono font-semibold">{sessionId}</span></p>
                </div>
              </div>

              {/* Redirect Notice */}
              <p className="text-sm text-muted-foreground">
                Redirecting to session room...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
