# Quick Start Guide - SkillSphere Features

## 🎯 Access the Features

### 1. Browse Experts (#299)
```
http://localhost:3000/explore-experts
```
- Search by name, category, or skill
- Filter by category
- Click expert card to view detailed profile
- Each profile shows: bio, skills, reviews, ratings

### 2. Expert Profile Detail (#299)
```
http://localhost:3000/explore-experts/1  (or 2, 3, 4)
```
- View full expert information
- See past reviews with ratings
- Check availability and response time
- Click "Book Session" button to start booking

### 3. Session Funding Demo (#300)
```
http://localhost:3000/ui-demo/fund-session
```
- Click "Open Funding Modal" button
- **Step 1:** Select duration (30/60/90 min or custom)
- **Step 2:** Confirm amount and transaction details
- **Step 3:** See success state with session ID

### 4. Video Call Demo (#305)
```
http://localhost:3000/ui-demo/video-call
```
- Click "Enter Full Screen Video Demo"
- Test mute/video toggle buttons
- Toggle between full-screen and picture-in-picture
- See call duration timer

### 5. Stellar Explorer (#304)
```
http://localhost:3000/ui-demo/transactions
```
- View session history table
- Click transaction hash links (opens Stellar.Expert)
- Copy hash to clipboard with button
- See network badges (Testnet/Mainnet)

### 6. Session Room (Active Call)
```
http://localhost:3000/session/1  (or 2, 3, 4)
```
- Live video call interface
- Toggle between full-screen and PIP modes
- End call button redirects to dashboard

---

## 🔧 Integration Guide

### Using FundSessionModal

```tsx
import FundSessionModal from '@/components/marketplace/FundSessionModal';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingPage() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = (sessionId: string) => {
    // Navigate to active session
    router.push(`/session/${sessionId}`);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Start Session
      </button>

      <FundSessionModal
        expertName="Sarah Chen"
        expertHourlyRate="$50/hr"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
```

### Using VideoCall Component

```tsx
import VideoCall from '@/components/session/VideoCall';
import { useState } from 'react';

export default function SessionPage() {
  const [isPIP, setIsPIP] = useState(false);

  return (
    <VideoCall
      expertName="Alex Kumar"
      seekerName="You"
      expertAvatar="/assets/Avatar.svg"
      seekerAvatar="/assets/Avatar.svg"
      isPictureInPicture={isPIP}
      onTogglePIP={() => setIsPIP(!isPIP)}
      onEndCall={() => {
        // Handle call ending
        console.log('Call ended');
      }}
    />
  );
}
```

### Using Stellar Explorer Utilities

```tsx
import { 
  formatExplorerUrl, 
  shortenHash, 
  copyHashToClipboard 
} from '@/utils/explorer';
import { ExternalLink, Copy } from 'lucide-react';

// Format URL for Stellar.Expert
const url = formatExplorerUrl(transactionHash, 'testnet');
// → https://testnet.stellar.expert/tx/a123456789...

// Shorten hash for display
const short = shortenHash(transactionHash);
// → a1234567...0abcd

// Copy to clipboard
<button onClick={() => copyHashToClipboard(hash)}>
  <Copy size={16} />
</button>
```

### Using SessionHistory Component

```tsx
import SessionHistory from '@/components/dashboard/SessionHistory';

export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <SessionHistory />
    </div>
  );
}
```

---

## 🎨 Component API Reference

### FundSessionModal Props

```typescript
interface FundSessionModalProps {
  expertName: string;           // e.g., "Sarah Chen"
  expertHourlyRate: string;     // e.g., "$50/hr"
  isOpen: boolean;              // Modal visibility
  onClose: () => void;          // Close handler
  onSuccess?: (sessionId: string) => void;  // Success callback
}
```

### VideoCall Props

```typescript
interface VideoCallProps {
  expertName: string;           // Expert's name
  seekerName: string;           // Seeker's name (usually "You")
  expertAvatar?: string;        // Expert's avatar URL
  seekerAvatar?: string;        // Seeker's avatar URL
  onEndCall?: () => void;       // End call handler
  isPictureInPicture?: boolean; // PIP mode toggle
  onTogglePIP?: () => void;     // PIP toggle handler
}
```

### ExpertDetails Props

```typescript
interface ExpertDetailsProps {
  expert: Expert;               // Expert object
  onBookClick?: () => void;     // Book button handler
}
```

---

## 📊 Mock Data Structure

### Expert
```typescript
{
  id: '1',
  name: 'Sarah Chen',
  avatar: '/assets/Avatar.svg',
  category: 'Web Development',
  rating: 4.8,
  reviews: 127,
  hourlyRate: '$50/hr',
  availability: true,
  bio: 'Senior Full-Stack Developer...',
  skills: ['React', 'Next.js', 'Node.js', ...],
  responseTime: '< 1 hour',
  totalSessions: 342,
  walletAddress: 'GBRPYHIL2CI27JTLZM3XYDNOH5Q5JQRQGCFBBZLT3JE5VPWLJ7JQWWZ',
  pastReviews: [
    {
      id: '1',
      reviewer: 'John Doe',
      rating: 5,
      comment: 'Excellent mentor!',
      date: '2025-06-01'
    }
  ]
}
```

### Session
```typescript
{
  id: '2',
  title: 'Blockchain Fundamentals',
  expertName: 'Alex Kumar',
  expertId: '2',
  expertAvatar: '/assets/Avatar.svg',
  seekerName: 'You',
  seekerAvatar: '/assets/Avatar.svg',
  date: '2025-06-10',
  time: '10:30 AM',
  duration: '90 mins',
  status: 'active',
  price: '$75',
  category: 'Blockchain',
  network: 'testnet',
  transactionHash: 'b234567890abcdef...'
}
```

### Transaction
```typescript
{
  id: '2',
  hash: 'b234567890abcdef1234567890abcdef1234567890abcdef1234567890abce',
  type: 'settlement',
  amount: '75 XLM',
  date: '2025-06-05',
  status: 'completed',
  network: 'testnet',
  sessionId: '3'
}
```

---

## 🔌 Next Steps for Real Implementation

### 1. Add WebRTC Support
```bash
npm install simple-peer
# or
npm install peerjs
```

Then replace placeholder video elements with actual WebRTC streams.

### 2. Connect Freighter Wallet
```bash
npm install @stellar/freighter-api
```

Update `FundSessionModal` to:
- Request public key from Freighter
- Sign transactions
- Submit to blockchain

### 3. Connect to Smart Contracts
- Update mock session creation to call contract
- Fetch real expert data from on-chain registry
- Stream real transaction hashes from ledger

### 4. Database Integration
- Replace mock data with API calls
- Store expert profiles in database
- Track sessions and transactions

### 5. Authentication
- Add user login/signup
- Connect to Freighter for wallet auth
- Store user sessions

---

## 📝 File Reference

| File | Purpose |
|------|---------|
| `src/utils/explorer.ts` | Stellar.Expert URL formatting |
| `src/types/types.ts` | TypeScript interfaces |
| `src/data/mock-data.ts` | Mock experts, sessions, transactions |
| `src/components/profile/ExpertDetails.tsx` | Expert profile display |
| `src/components/marketplace/ExpertCard.tsx` | Expert listing card |
| `src/components/marketplace/FundSessionModal.tsx` | Funding wizard |
| `src/components/session/VideoCall.tsx` | Video call interface |
| `src/components/dashboard/SessionHistory.tsx` | Transaction history |

---

## 🐛 Debugging Tips

### Check Mock Data
```typescript
import { mockExperts, mockSessions, mockTransactions } from '@/utils/data/mock-data';
console.log(mockExperts);
```

### Test Explorer Links
```typescript
import { formatExplorerUrl } from '@/utils/explorer';
const url = formatExplorerUrl('a123...', 'testnet');
window.open(url); // Opens Stellar.Expert
```

### Session Flow Debug
```typescript
// In session page
console.log('Session ID:', params.id);
console.log('Session found:', session);
console.log('Expert found:', expert);
```

---

## ✨ UI Customization

All components use Tailwind CSS and support theming. To customize:

1. **Colors:** Change gradient colors in component className
   ```tsx
   // From purple-600/pink-600 to your colors
   className="from-blue-600 to-cyan-600"
   ```

2. **Sizing:** Adjust responsive breakpoints
   ```tsx
   // md: (768px), lg: (1024px), etc.
   className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
   ```

3. **Typography:** Use custom font sizes
   ```tsx
   // text-xs, text-sm, text-base, text-lg, text-xl, etc.
   className="text-2xl font-bold"
   ```

---

## 📞 Component Status

| Component | Status | Notes |
|-----------|--------|-------|
| ExpertDetails | ✅ Complete | Ready for production |
| ExpertCard | ✅ Complete | Ready for production |
| FundSessionModal | ✅ Complete | Needs wallet integration |
| VideoCall | ✅ Complete | Needs WebRTC library |
| SessionHistory | ✅ Complete | Works with mock data |
| Explorer Utils | ✅ Complete | Ready for blockchain data |

---

All features are ready for testing and integration with real backend services!
