import { importCollection, buildImportArgs } from "./import-collection"

const printUsage = () => {
    console.log("Usage: node json2supabase.js <path_to_json_file> [<primary_key_strategy>] [<primary_key_name>]")
    console.log("  collection_name: collection name to import")
    console.log("  primary_key_strategy (optional):")
    console.log("    none (no primary key is added")
    console.log("    serial (id SERIAL PRIMARY KEY) (autoincrementing 2-byte integer)")
    console.log("    smallserial (id SMALLSERIAL PRIMARY KEY) (autoincrementing 4-byte integer)")
    console.log("    bigserial (id BIGSERIAL PRIMARY KEY) (autoincrementing 8-byte integer)")
    console.log("    uuid (id UUID PRIMARY KEY DEFAULT uuid_generate_v4()) (randomly generated uuid)")
    console.log("    firestore_id (id TEXT PRIMARY KEY) (uses existing firestore_id random text as key)")
    console.log('  primary_key_name (optional): name of primary key (defaults to "id")')
}

async function main() {
    const args = process.argv.slice(2)
    if (args.length < 1) {
        printUsage()
        process.exit(1)
    }
    const importArgs = await buildImportArgs(args[0], args[1], args[2])
    await importCollection(importArgs)
    await importArgs.client.end()
    process.exit(0)
}

main()
