import express from "express";
import { Client } from "@notionhq/client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import multer from "multer";
import sharp from "sharp";
import axios from "axios";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Debug: Log environment variables (without sensitive values)
console.log("Environment variables loaded:");
console.log("NOTION_TOKEN:", (process.env.NOTION_TOKEN || process.env.NOTION_API_KEY) ? "✓ Set" : "✗ Missing");
console.log("NOTION_DATABASE_ID:", process.env.NOTION_DATABASE_ID ? "✓ Set" : "✗ Missing");
console.log("NOTION_MOODBOARD_ID:", process.env.NOTION_MOODBOARD_ID ? "✓ Set" : "✗ Missing");

const supabaseUrl = process.env.MOODBOARD_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.MOODBOARD_PUBLIC_SUPABASE_ANON_KEY;

console.log("MOODBOARD_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓ Set" : "✗ Missing");
console.log("MOODBOARD_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "✓ Set" : "✗ Missing");

// Serve static frontend files
app.use(express.static("public"));
app.use(express.json());

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;
const moodboardId = process.env.NOTION_MOODBOARD_ID;

// Initialize Supabase client only if credentials are available
let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log("✓ Supabase client initialized successfully");
    } catch (error) {
        console.error("✗ Failed to initialize Supabase client:", error.message);
    }
} else {
    console.warn("⚠ Supabase credentials missing - image upload/display functionality will be limited");
}

// Configure multer for file uploads (kept for compatibility but unused now)
const upload = multer({ storage: multer.memoryStorage() });

// Persistent storage for page mappings
const CACHE_FILE = path.join(process.cwd(), 'page-image-cache.json');

// In-memory cache for processed images
const pageImageCache = new Map();
const existingFiles = new Set(); // Set of all files that exist in Supabase

// Load cache from file on startup
async function loadCache() {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf8');
        const cacheData = JSON.parse(data);
        console.log(`📂 Loading ${Object.keys(cacheData).length} cached mappings from file`);
        for (const [pageId, imageUrl] of Object.entries(cacheData)) {
            pageImageCache.set(pageId, imageUrl);
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn('⚠️  Error loading cache file:', error.message);
        }
    }
}

// Save cache to file
async function saveCache() {
    try {
        const cacheData = Object.fromEntries(pageImageCache);
        await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2));
        console.log(`💾 Saved ${pageImageCache.size} mappings to cache file`);
    } catch (error) {
        console.error('❌ Error saving cache file:', error.message);
    }
}

// Load all existing files from Supabase on startup
async function loadExistingFiles() {
    if (!supabase) return;
    
    try {
        console.log('🔍 Loading existing files from Supabase...');
        let allFiles = [];
        let offset = 0;
        const limit = 1000;
        
        while (true) {
            const { data, error } = await supabase
                .storage
                .from('Moodboard')
                .list('', { 
                    limit,
                    offset,
                    sortBy: { column: 'name', order: 'asc' }
                });
            
            if (error) {
                console.error('❌ Error loading files from Supabase:', error.message);
                break;
            }
            
            if (!data || data.length === 0) break;
            
            allFiles = allFiles.concat(data);
            offset += limit;
            
            if (data.length < limit) break; // Last page
        }
        
        for (const file of allFiles) {
            existingFiles.add(file.name);
        }
        
        console.log(`📁 Loaded ${existingFiles.size} existing files from Supabase`);
    } catch (error) {
        console.error('❌ Error loading existing files:', error.message);
    }
}

// Initialize caches on startup
(async () => {
    await Promise.all([loadCache(), loadExistingFiles()]);
    console.log('🚀 Cache initialization complete');
})();

// Helper: extract image URL from a Notion page
function extractNotionImageUrl(page) {
    const props = page.properties || {};
    for (const [key, prop] of Object.entries(props)) {
        if (prop.type === "files" && Array.isArray(prop.files) && prop.files.length > 0) {
            for (const file of prop.files) {
                if (file.type === "external" && file.external?.url) return file.external.url;
                if (file.type === "file" && file.file?.url) return file.file.url;
            }
        }
    }
    if (page.cover) {
        if (page.cover.type === "external" && page.cover.external?.url) return page.cover.external.url;
        if (page.cover.type === "file" && page.cover.file?.url) return page.cover.file.url;
    }
    return null;
}

// Helper: generate consistent filename from page ID
function generateFilename(pageId) {
    const hash = crypto.createHash("sha1").update(pageId).digest("hex");
    return `${hash}.webp`;
}

// Helper: get optimized WebP buffer with highest quality and smallest size
async function getOptimizedWebP(buffer) {
    try {
        // Get image metadata first
        const metadata = await sharp(buffer).metadata();
        
        // Determine optimal quality based on image characteristics
        let quality = 85; // Start with high quality
        let effort = 6; // Maximum compression effort
        
        // For very large images, we can afford slightly lower quality for better compression
        if (metadata.width > 2000 || metadata.height > 2000) {
            quality = 82;
        }
        
        // For images with transparency, handle differently
        const hasAlpha = metadata.channels === 4 || metadata.hasAlpha;
        
        let sharpInstance = sharp(buffer);
        
        // Resize if image is extremely large (over 3000px on any side)
        if (metadata.width > 3000 || metadata.height > 3000) {
            const maxDimension = 3000;
            sharpInstance = sharpInstance.resize(maxDimension, maxDimension, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }
        
        // Convert to WebP with optimal settings
        const webpOptions = {
            quality,
            effort, // 0-6, higher = better compression but slower
            lossless: false, // Use lossy compression for better file sizes
            nearLossless: false,
            smartSubsample: true, // Better compression for photos
            preset: 'photo' // Optimize for photographic images
        };
        
        // If image has alpha channel, handle transparency properly
        if (hasAlpha) {
            webpOptions.alphaQuality = Math.min(quality + 5, 100);
        }
        
        const webpBuffer = await sharpInstance
            .webp(webpOptions)
            .toBuffer();
        
        // Log compression results
        const originalSize = buffer.length;
        const compressedSize = webpBuffer.length;
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        
        console.log(`📊 Image optimized: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${compressionRatio}% reduction)`);
        
        return webpBuffer;
    } catch (error) {
        throw new Error(`WebP optimization failed: ${error.message}`);
    }
}

// Helper: ensure image exists in Supabase and return public URL
async function ensureSupabaseWebp(srcUrl, pageId) {
    if (!supabase) return null;
    
    // First check if we've already processed this specific page
    if (pageImageCache.has(pageId)) {
        console.log(`💾 Page cache hit for ${pageId}`);
        return pageImageCache.get(pageId);
    }
    
    const filename = generateFilename(pageId);
    
    // Check if file exists in our loaded file list
    if (existingFiles.has(filename)) {
        const { data: pub } = supabase.storage.from("Moodboard").getPublicUrl(filename);
        const publicUrl = pub.publicUrl;
        
        // Cache it for future requests
        pageImageCache.set(pageId, publicUrl);
        console.log(`✅ Using existing file: ${filename} for page ${pageId}`);
        
        // Save cache periodically
        if (pageImageCache.size % 10 === 0) {
            await saveCache();
        }
        
        return publicUrl;
    }

    // File does not exist — download, convert and upload
    console.log(`🔄 Processing new image: ${filename} for page ${pageId}`);
    try {
        const response = await axios.get(srcUrl, { 
            responseType: "arraybuffer",
            timeout: 30000, // 30 second timeout
            maxContentLength: 50 * 1024 * 1024, // 50MB max
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const buffer = Buffer.from(response.data);
        const webpBuffer = await getOptimizedWebP(buffer);

        // Upload the new file
        const { data, error: upErr } = await supabase.storage
            .from("Moodboard")
            .upload(filename, webpBuffer, {
                contentType: "image/webp",
                upsert: false, // Don't overwrite - we know it doesn't exist
                cacheControl: "31536000" // 1 year cache
            });
        
        if (upErr) {
            // If it failed because file exists (rare race condition), that's OK
            if (upErr.message && upErr.message.includes('already exists')) {
                console.log(`ℹ️  File created by another process: ${filename}`);
            } else {
                console.error(`❌ Upload failed for ${filename}:`, upErr.message);
                throw upErr;
            }
        } else {
            console.log(`✅ Successfully uploaded: ${filename}`);
        }
        
        // Add to our existing files set
        existingFiles.add(filename);
        
    } catch (e) {
        console.error(`❌ Failed to process image ${filename}:`, e.message);
        throw new Error(`Failed to process and upload image: ${e.message}`);
    }

    // Get public URL and cache it
    const { data: pub } = supabase.storage.from("Moodboard").getPublicUrl(filename);
    const publicUrl = pub.publicUrl;
    
    pageImageCache.set(pageId, publicUrl);
    
    // Save cache after processing new images
    await saveCache();
    
    return publicUrl;
}

// Helper: read Notion properties
function readTitle(page, key) {
    const prop = page.properties?.[key];
    if (prop?.type === "title" && Array.isArray(prop.title)) return prop.title.map(t => t.plain_text).join(" ") || undefined;
    return undefined;
}
function readSelect(page, key) {
    const prop = page.properties?.[key];
    if (prop?.type === "select" && prop.select) return prop.select.name;
    return undefined;
}
function readRichText(page, key) {
    const prop = page.properties?.[key];
    if (prop?.type === "rich_text" && Array.isArray(prop.rich_text)) return prop.rich_text.map(t => t.plain_text).join(" ") || undefined;
    return undefined;
}
function readUrl(page, key) {
    const prop = page.properties?.[key];
    if (prop?.type === "url") return prop.url || undefined;
    return undefined;
}

// Helper: process images concurrently with rate limiting
async function processImagesInBatches(pages, batchSize = 5) {
    const results = [];
    
    for (let i = 0; i < pages.length; i += batchSize) {
        const batch = pages.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pages.length / batchSize)} (${batch.length} images)`);
        
        const batchPromises = batch.map(async (page) => {
            const srcUrl = extractNotionImageUrl(page);
            if (!srcUrl) return null;
            
            try {
                const publicUrl = await ensureSupabaseWebp(srcUrl, page.id);
                return {
                    id: page.id,
                    imageUrl: publicUrl,
                    name: readTitle(page, "Name") || "Untitled",
                    designer: readSelect(page, "Designer") || null,
                    year: readSelect(page, "Year") || null,
                    client: readRichText(page, "Client") || readSelect(page, "Client") || null,
                    link: readUrl(page, "Link") || null,
                    city: readSelect(page, "City") || readRichText(page, "City") || null,
                    createdAt: page.created_time,
                    updatedAt: page.last_edited_time
                };
            } catch (e) {
                console.warn(`⚠️  Image processing failed for page ${page.id}:`, e.message || e);
                return null;
            }
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Extract successful results and filter out nulls
        const successfulResults = batchResults
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value);
        
        results.push(...successfulResults);
        
        // Small delay between batches to avoid overwhelming the services
        if (i + batchSize < pages.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    
    return results;
}

// API endpoint to fetch moodboard data from Notion (Published only)
app.get("/api/moodboard", async (req, res) => {
    try {
        console.log("🔍 Fetching moodboard data from Notion...");
        let allResults = [];
        let hasMore = true;
        let nextCursor = null;
        let pageCount = 0;
        
        while (hasMore) {
            pageCount++;
            console.log(`📄 Fetching page ${pageCount}...`);
            const queryParams = {
                database_id: moodboardId,
                page_size: 100,
                filter: {
                    property: "Status",
                    select: { equals: "Published" }
                }
            };
            if (nextCursor) queryParams.start_cursor = nextCursor;
            
            const response = await notion.databases.query(queryParams);
            console.log(`📊 Page ${pageCount}: ${response.results.length} results`);
            allResults = allResults.concat(response.results);
            hasMore = response.has_more;
            nextCursor = response.next_cursor;
            
            if (hasMore) await new Promise(r => setTimeout(r, 100));
        }
        console.log(`🎯 Total results from all pages: ${allResults.length}`);

        // Process images in batches to improve performance and prevent overwhelming services
        const mapped = await processImagesInBatches(allResults, 8); // Process 8 images concurrently
        
        console.log(`✅ Successfully processed ${mapped.length} images`);
        return res.json(mapped);
        
    } catch (error) {
        console.error("❌ Error fetching moodboard data:", error);
        res.status(500).json({ error: "Failed to fetch moodboard data" });
    }
});

// Legacy endpoint kept but not used by the client anymore
app.post("/api/upload-image", upload.single("image"), async (req, res) => {
    return res.status(410).json({ error: "Client uploads disabled. Images are processed server-side." });
});

app.get("/data", async (req, res) => {
    try {
        const response = await notion.databases.query({
            database_id: databaseId,
            sorts: [{ property: "Name", direction: "ascending" }]
        });
        res.json(response.results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

// Suggest a Studio endpoint
app.post("/api/suggest-studio", async (req, res) => {
    try {
        const { name, website, instagram, city, hasAddress, address } = req.body || {};

        // Basic validation
        if (!name || !city) {
            return res.status(400).json({ error: "Missing required fields: name and city" });
        }
        if (!hasAddress) {
            return res.status(400).json({ error: "Missing required field: hasAddress" });
        }
        if (hasAddress === "yes" && !address) {
            return res.status(400).json({ error: "Address is required when hasAddress is yes" });
        }

        // Map to Notion properties
        const properties = {
            Name: {
                title: [{ type: "text", text: { content: name } }]
            },
            City: {
                select: city ? { name: city } : null
            },
            "Website URL": {
                url: website || null
            },
            IG: {
                url: instagram || null
            },
            Address: {
                rich_text: address ? [{ type: "text", text: { content: address } }] : []
            },
            Status: {
                status: { name: "To Review" }
            }
        };

        // Create the page in Notion
        await notion.pages.create({
            parent: { database_id: databaseId },
            properties
        });

        return res.json({ ok: true });
    } catch (error) {
        console.error("Suggest studio failed:", error?.message || error);
        return res.status(500).json({ error: "Failed to submit suggestion" });
    }
});

app.get("/moodboard", (req, res) => {
    res.sendFile("public/moodboard.html", { root: "." });
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ 
        status: "ok", 
        pageCacheSize: pageImageCache.size,
        existingFilesCount: existingFiles.size,
        supabaseConnected: !!supabase 
    });
});

// Clear cache endpoint (useful for development/maintenance)
app.post("/api/clear-cache", async (req, res) => {
    const pageCacheSize = pageImageCache.size;
    pageImageCache.clear();
    
    try {
        await fs.unlink(CACHE_FILE);
        console.log(`🗑️  Cleared cache file and memory (${pageCacheSize} entries)`);
        res.json({ message: `Cleared ${pageCacheSize} cached entries and cache file` });
    } catch (error) {
        console.log(`🗑️  Cleared memory cache (${pageCacheSize} entries)`);
        res.json({ message: `Cleared ${pageCacheSize} cached entries from memory` });
    }
});

// Refresh existing files cache
app.post("/api/refresh-files", async (req, res) => {
    existingFiles.clear();
    await loadExistingFiles();
    res.json({ message: `Refreshed files cache. Found ${existingFiles.size} existing files.` });
});

// Save cache manually
app.post("/api/save-cache", async (req, res) => {
    await saveCache();
    res.json({ message: `Saved ${pageImageCache.size} mappings to cache file` });
});

// Graceful shutdown - save cache when server is shutting down
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, saving cache before exit...');
    await saveCache();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, saving cache before exit...');
    await saveCache();
    process.exit(0);
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));