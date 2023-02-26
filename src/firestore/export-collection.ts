import { exportFromCollection } from "./firestore2json"
import { FirestoreDoc, DocumentProcessor, RecordCounters, WriteRecordsSync } from "../utils/utils"
import fs from "fs"
const args = process.argv.slice(2)

let processDocument: DocumentProcessor | undefined

if (fs.existsSync(`./${args[0]}.js`)) {
    // read file to string
    processDocument = require(`./${args[0]}.js`)
}
if (args.length < 1) {
    console.log("Usage: firestore2json.ts <collectionName> [<batchSize>] [<limit>]")
    process.exit(1)
} else {
    main(args[0], args[1] || "1000", args[2] || "0")
}
async function main(collectionName: string, batchSize: string, limit: string) {
    // if (fs.existsSync(`./${collectionName}.json`)) {
    //     console.log(`${collectionName}.json already exists, aborting...`);
    //     process.exit(1);
    // } else {
    await exportFromCollection(collectionName, 0, parseInt(batchSize), parseInt(limit), processDocument)
    // }
}
