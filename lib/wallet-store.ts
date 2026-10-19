// Both shops use this conditional balance inside a single SQLite write, so
// simultaneous island and equipment purchases cannot spend the same stars.
export const walletBalanceSql = `100
 +COALESCE((SELECT SUM(amount) FROM island_rewards WHERE owner_id=?),0)
 -COALESCE((SELECT SUM(cost) FROM island_items WHERE owner_id=?),0)
 -COALESCE((SELECT SUM(cost) FROM character_inventory WHERE owner_id=?),0)`;
