
import sys

file_path = 'contracts/src/lib.rs'

with open(file_path, 'r') as f:
    content = f.read()

# Fix withdraw_accrued require_auth
old_auth_withdraw = """        // Verify caller is the expert
        if let Err(_) = session.expert.require_auth() {
             Self::set_reentrancy_lock(&env, false);
             session.expert.require_auth(); // This will panic as expected
        }"""
new_auth_withdraw = """        // Verify caller is the expert
        session.expert.require_auth();"""

content = content.replace(old_auth_withdraw, new_auth_withdraw)

# Fix claim_no_show_refund require_auth (if needed)
# I'll also fix the missing brace issue I saw earlier if it persists.
if "}get(0).unwrap(), 95);" in content:
    content = content.replace("}get(0).unwrap(), 95);\\n        assert_eq!(results.get(1).unwrap(), 0);\\n    }\\n}", "}\\n}")

# Fix the missing brace at 3420
# I'll just append it properly at the end of the treasury test
pattern_treasury = """        assert_eq!(token1_fees, 5); // 5% of 100
        assert_eq!(token2_fees, 5); // 5% of 100
    }"""
if "assert_eq!(token2_fees, 5); // 5% of 100\\n    #[test]" in content:
    content = content.replace("assert_eq!(token2_fees, 5); // 5% of 100\\n    #[test]", "assert_eq!(token2_fees, 5); // 5% of 100\\n    }\\n\\n    #[test]")

with open(file_path, 'w') as f:
    f.write(content)
