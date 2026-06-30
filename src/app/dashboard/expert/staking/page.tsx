"use client";

import { StakingManager } from "@/components/dashboard/StakingManager";

export default function StakingPage() {
  const handleStake = async (amount: number) => {
    console.log("Staking:", amount);
    // TODO: Integrate with smart contract
  };

  const handleUnstake = async (amount: number) => {
    console.log("Unstaking:", amount);
    // TODO: Integrate with smart contract
  };

  const handleClaimRewards = async () => {
    console.log("Claiming rewards");
    // TODO: Integrate with smart contract
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <StakingManager
        stakedBalance={5000}
        currentAPY={12}
        claimableEarnings={125.50}
        walletBalance={10000}
        onStake={handleStake}
        onUnstake={handleUnstake}
        onClaimRewards={handleClaimRewards}
      />
    </div>
  );
}
