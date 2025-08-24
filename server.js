import express from "express";
import { Client } from "@notionhq/client";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files
app.use(express.static("public"));

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

// API endpoint to fetch database entries
app.get("/data", async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ property: "Name", direction: "ascending" }] // optional
    });
    res.json(response.results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
