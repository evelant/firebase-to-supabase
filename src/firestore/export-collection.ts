import { exportFromCollection } from "./firestore-export"
import { FirestoreDoc, DocumentProcessor, RecordCounters, WriteRecordsSync, getCredentials } from "../utils/utils"
import fs from "fs"
const args = process.argv.slice(2)

let processDocument: DocumentProcessor | undefined

if (fs.existsSync(`./${args[0]}.js`)) {
    // read file to string
    processDocument = require(`./${args[0]}.js`)
}
if (args.length < 1) {
    console.log("Usage: pnpm firestore-export-collection <collectionName> <credentialsDir> [<batchSize>] [<limit>]")
    process.exit(1)
} else {
    const { credentialsDir } = getCredentials()
    main(args[1], credentialsDir, args[2] || "1000", args[3] || "0")
}
async function main(collectionName: string, credentialsDir: string, batchSize: string, limit: string) {
    await exportFromCollection(collectionName, credentialsDir, 0, parseInt(batchSize), parseInt(limit), processDocument)
}
