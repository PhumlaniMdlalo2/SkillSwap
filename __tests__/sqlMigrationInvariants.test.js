const fs = require('fs');
const path = require('path');
// Determine __dirname safely in Jest/Node test environment
let __dirname = process.cwd();
if (require.main && require.main.path) {
  __dirname = path.dirname(require.main.path);
} else if (require.main && require.main.filename) {
  __dirname = path.dirname(require.main.filename);
}

const root = __dirname;
const freshSchema = fs.readFileSync(path.join(root, 'supabase/migrations/schema.sql'), 'utf8');
const auditMigration = fs.readFileSync(path.join(root, 'supabase/migrations/018_audit_fixes.sql'), 'utf8');

function expectSecurityInvariants(sql) {
  expect(sql).toMatch(/public\.is_admin\(\)/);
  expect(sql).toMatch(/revoke select, insert, update, delete on public\.users from anon, authenticated/i);
  expect(sql).toMatch(/grant select \([^)]*xp[^)]*\)\s+on public\.users to anon, authenticated/i);
  expect(sql).toMatch(/references public\.matches\(match_id\) on delete set null/i);
  expect(sql).toMatch(/alter publication supabase_realtime add table public\.messages/i);
  expect(sql).toMatch(/revoke all on function public\.award_xp_and_streak\(uuid, integer\) from public, anon, authenticated/i);
  expect(sql).toMatch(/revoke all on function public\.set_learning_interests\(uuid, text\[\]\) from public, anon/i);
}

describe('SQL migration invariants', () => {
  it('fresh schema keeps the audit security fixes', () => {
    expectSecurityInvariants(freshSchema);
  });

  it('incremental migration keeps the audit security fixes', () => {
    expectSecurityInvariants(auditMigration);
  });

  it('completion records completed_at and awards both participants', () => {
    for (const sql of [freshSchema, auditMigration]) {
      expect(sql).toMatch(/set status = 'completed', completed_at = now\(\)/);
      expect(sql).toMatch(/award_xp_and_streak\(v_session\.teacher_id, 100\)/);
      expect(sql).toMatch(/award_xp_and_streak\(v_session\.learner_id, 100\)/);
    }
  });

  it('token bounties pay the helper only through a completed trade', () => {
    for (const sql of [freshSchema, auditMigration]) {
      expect(sql).toMatch(/balance = balance - v_bounty\.token_amount/);
      expect(sql).toMatch(/balance = balance \+ v_bounty\.token_amount/);
      expect(sql).toMatch(/'Bounty reward: ' \|\| v_bounty\.title/);
      expect(sql).not.toMatch(/old\.reward_type = 'swap'/);
    }
  });

  it('swap candidates filter the saved category before the limit', () => {
    for (const sql of [freshSchema, auditMigration]) {
      expect(sql).toMatch(/my_swap\.skill_category is null or s\.category = my_swap\.skill_category/);
    }
  });
});
