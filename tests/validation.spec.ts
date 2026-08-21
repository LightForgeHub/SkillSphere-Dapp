import {
  expertRegistrationSchema,
  calculateHourlyRate,
  calculateMinuteRate,
  parseTags,
} from "../src/utils/validation";

/**
 * Lightweight test suite runner for validation.ts
 */
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ FAIL: ${name}`, err);
      failed++;
    }
  }

  console.log("=== Running Expert Registration Zod Validation Tests ===\n");

  test("Validates complete valid expert registration payload", () => {
    const validData = {
      displayName: "Sarah Chen",
      title: "Senior Soroban Smart Contract Architect",
      bio: "10+ years in distributed systems and Stellar smart contracts. Happy to mentor and consult.",
      tags: "Soroban, Rust, Smart Contracts, DeFi",
      ratePerSecond: 0.003,
      yearsOfExperience: 6,
      portfolioUrl: "https://sarahchen.dev",
      githubUrl: "https://github.com/sarahchen",
      twitterUrl: "https://x.com/sarahchen",
      languages: "English, Mandarin",
    };

    const result = expertRegistrationSchema.safeParse(validData);
    assert(result.success === true, "Expected schema validation to succeed for valid payload");
  });

  test("Validates minimal valid expert registration payload", () => {
    const minimalData = {
      displayName: "Alex Doe",
      bio: "Expert in WebRTC, video streaming architecture, and audio synchronization.",
      tags: "WebRTC, TypeScript",
      ratePerSecond: 0.001,
    };

    const result = expertRegistrationSchema.safeParse(minimalData);
    assert(result.success === true, "Expected minimal payload to succeed");
  });

  test("Rejects display name that is too short or too long", () => {
    const tooShort = {
      displayName: "A",
      bio: "Expert in WebRTC, video streaming architecture, and audio synchronization.",
      tags: "WebRTC",
      ratePerSecond: 0.001,
    };
    assert(expertRegistrationSchema.safeParse(tooShort).success === false, "Should reject 1-char name");

    const tooLong = {
      displayName: "A".repeat(61),
      bio: "Expert in WebRTC, video streaming architecture, and audio synchronization.",
      tags: "WebRTC",
      ratePerSecond: 0.001,
    };
    assert(expertRegistrationSchema.safeParse(tooLong).success === false, "Should reject >60-char name");
  });

  test("Rejects bio that is under 20 characters", () => {
    const shortBio = {
      displayName: "Alex Doe",
      bio: "Too short bio",
      tags: "WebRTC",
      ratePerSecond: 0.001,
    };
    const result = expertRegistrationSchema.safeParse(shortBio);
    assert(result.success === false, "Should reject bio < 20 chars");
  });

  test("Rejects invalid rate per second (zero, negative, exceeding max)", () => {
    const zeroRate = {
      displayName: "Alex Doe",
      bio: "Expert in WebRTC, video streaming architecture, and audio synchronization.",
      tags: "WebRTC",
      ratePerSecond: 0,
    };
    assert(expertRegistrationSchema.safeParse(zeroRate).success === false, "Should reject zero rate");

    const negativeRate = {
      displayName: "Alex Doe",
      bio: "Expert in WebRTC, video streaming architecture, and audio synchronization.",
      tags: "WebRTC",
      ratePerSecond: -0.05,
    };
    assert(expertRegistrationSchema.safeParse(negativeRate).success === false, "Should reject negative rate");

    const excessiveRate = {
      displayName: "Alex Doe",
      bio: "Expert in WebRTC, video streaming architecture, and audio synchronization.",
      tags: "WebRTC",
      ratePerSecond: 15,
    };
    assert(expertRegistrationSchema.safeParse(excessiveRate).success === false, "Should reject rate > 10");
  });

  test("Rejects invalid URLs and invalid GitHub URLs", () => {
    const invalidUrl = {
      displayName: "Alex Doe",
      bio: "Expert in WebRTC, video streaming architecture, and audio synchronization.",
      tags: "WebRTC",
      ratePerSecond: 0.001,
      portfolioUrl: "not-a-valid-url",
    };
    assert(expertRegistrationSchema.safeParse(invalidUrl).success === false, "Should reject malformed portfolio URL");

    const invalidGithub = {
      displayName: "Alex Doe",
      bio: "Expert in WebRTC, video streaming architecture, and audio synchronization.",
      tags: "WebRTC",
      ratePerSecond: 0.001,
      githubUrl: "https://gitlab.com/username",
    };
    assert(expertRegistrationSchema.safeParse(invalidGithub).success === false, "Should reject non-github domain for githubUrl");
  });

  test("Calculates correct minute and hourly rates", () => {
    const ratePerSec = 0.003;
    const minRate = calculateMinuteRate(ratePerSec);
    const hrRate = calculateHourlyRate(ratePerSec);

    assert(minRate === 0.18, `Expected minute rate 0.18, got ${minRate}`);
    assert(hrRate === 10.8, `Expected hourly rate 10.80, got ${hrRate}`);
  });

  test("Parses comma-separated tags accurately", () => {
    const tagString = "Soroban, Rust, Smart Contracts , DeFi ";
    const parsed = parseTags(tagString);
    assert(parsed.length === 4, `Expected 4 tags, got ${parsed.length}`);
    assert(parsed[0] === "Soroban", "First tag should be Soroban");
    assert(parsed[2] === "Smart Contracts", "Third tag should be Smart Contracts");
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runTests();
