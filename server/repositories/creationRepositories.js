import sql from "../config/db.js";

// The ONLY place that knows how a creation is stored in the database.
export const saveCreation = async ({ userId, prompt, content, type }) => {
  await sql`
    INSERT INTO creations (user_id, prompt, content, type)
    VALUES (${userId}, ${prompt}, ${content}, ${type})
  `;
};