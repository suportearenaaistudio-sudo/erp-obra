/**
 * RAG Ingestion Script
 * 
 * Reads markdown files from knowledge-base/, chunks them, and sends them to
 * the ingest-knowledge Edge Function for embedding and storage.
 * 
 * Run with: npx tsx scripts/ingest-knowledge.ts
 */

import 'dotenv/config'; // Load .env.local
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Load env vars explicitly if dotenv/config didn't pick up .env.local
import dotenv from 'dotenv';
dotenv.config({ path: path.join(projectRoot, '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing environment variables!');
    console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

async function ingestFile(filePath: string, docType: string) {
    console.log(`\n📄 Processing ${path.basename(filePath)}...`);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Split by headers (H1, H2, H3)
    const rawChunks = content.split(/\n(?=#{1,3} )/g);
    const chunksToIngest = [];

    for (const chunk of rawChunks) {
        if (!chunk.trim()) continue;

        // Extract title
        const lines = chunk.split('\n');
        const titleLine = lines.find(l => l.match(/^#{1,3} /));
        const title = titleLine ? titleLine.replace(/^#{1,3} /, '').trim() : path.basename(filePath);

        // Clean content
        const cleanContent = chunk.trim();

        console.log(`  🔹 Planning chunk: "${title}" (${cleanContent.length} chars)`);

        chunksToIngest.push({
            title,
            content: cleanContent,
            doc_type: docType,
            metadata: { source: path.basename(filePath) }
        });
    }

    // Send to Edge Function
    if (chunksToIngest.length > 0) {
        console.log(`  🚀 Sending ${chunksToIngest.length} chunks to Edge Function...`);

        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/ingest-knowledge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                },
                body: JSON.stringify({ chunks: chunksToIngest })
            });

            if (!response.ok) {
                throw new Error(`Function error: ${await response.text()}`);
            }

            const result = await response.json();
            console.log(`  ✅ Function result:`, result);

        } catch (err: any) {
            console.error(`  ❌ Error calling ingestion function: ${err.message}`);
        }
    }
}

async function main() {
    const kbDir = path.join(projectRoot, 'knowledge-base');

    if (fs.existsSync(path.join(kbDir, 'faq.md'))) {
        await ingestFile(path.join(kbDir, 'faq.md'), 'faq');
    }

    if (fs.existsSync(path.join(kbDir, 'policies.md'))) {
        await ingestFile(path.join(kbDir, 'policies.md'), 'policy');
    }

    console.log('\n✨ Ingestion complete!');
}

main().catch(console.error);
