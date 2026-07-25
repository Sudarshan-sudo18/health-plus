import { User } from "../../../models/User.js";

export async function migrateUserIdentityIndexes() {
  const collection = User.collection;
  let indexes = [];
  try {
    indexes = await collection.indexes();
  } catch (error) {
    if (error?.code !== 26) {
      throw error;
    }
  }
  const legacyEmailIndex = indexes.find(
    (index) => index.unique === true && Object.keys(index.key || {}).length === 1 && index.key.email === 1
  );

  if (legacyEmailIndex) {
    await collection.dropIndex(legacyEmailIndex.name);
    console.info("Migrated User identity index from email to email and role.");
  }

  await collection.createIndex(
    { email: 1, role: 1 },
    { unique: true, name: "email_role_unique" }
  );
}
