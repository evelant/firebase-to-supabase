import {
    getFirestoreInstance,
    writeRecordsSync,
    FirestoreDoc,
    RecordCounters,
    DocumentProcessor,
    deleteIfExists,
} from "../utils/utils"
import * as fs from "fs"

const recordCounters: RecordCounters = {}
let limit = 0

export const exportEntireCollection = async (collectionName: string, credentialsDir: string) => {
    deleteIfExists(`../../exported/firestore/${credentialsDir}/${collectionName}.json`)
    return await exportFromCollection(collectionName, credentialsDir, 0, 1000, 0)
}
export async function exportFromCollection(
    collectionName: string,
    credentialsDir: string,
    offset: number,
    batchSize: number,
    limit: number,
    processDocument?: DocumentProcessor | undefined
) {
    if (offset == 0) {
        console.log(`Begin export of ${collectionName}`)
        if (fs.existsSync(`../../exported/firestore/${credentialsDir}/${collectionName}.json`))
            console.log(`removing previous export of ${collectionName} at exported/firestore/${credentialsDir}`)
        fs.rmSync(`../../exported/firestore/${credentialsDir}/${collectionName}.json`, { force: true })
    }
    const s = performance.now()
    const { data, error } = await getBatch(collectionName, offset, batchSize, limit, processDocument)
    if (error) {
        console.error(`Error processing ${collectionName} chunk at offset ${offset}!`, error)
        throw error
    }
    writeRecordsSync(collectionName, data, recordCounters, `firestore/${credentialsDir}`)
    const s2 = performance.now()
    console.log(
        `    progress: exported total of ${data.length + offset} docs from ${collectionName} in ${
            Math.round(s2 - s) / 1000
        }s`
    )
    if (data.length > 0) {
        await exportFromCollection(
            collectionName,
            credentialsDir,
            offset + data.length,
            batchSize,
            limit,
            processDocument
        )
    } else {
        cleanUp(collectionName, credentialsDir)
        console.log(`    Done: ${recordCounters[collectionName]} records written to ${collectionName}.json`)
    }
}
const cleanUp = (collectionName: string, credentialsDir: string) => {
    fs.appendFileSync(`../../exported/firestore/${credentialsDir}/${collectionName}.json`, "\n]", "utf8")
}

async function getBatch(
    collectionName: string,
    offset: number,
    batchSize: number,
    limit: number,
    processDocument?: DocumentProcessor | undefined
): Promise<{ data: FirestoreDoc[]; error: Error | null }> {
    const data: FirestoreDoc[] = []
    let error = null
    if (limit !== 0 && recordCounters[collectionName] >= limit) {
        return { data, error }
    }
    if (typeof recordCounters[collectionName] === "undefined") {
        recordCounters[collectionName] = 0
    }
    if (limit > 0) {
        batchSize = Math.min(batchSize, limit - recordCounters[collectionName])
    }
    try {
        // console.log(`    fetching ${batchSize} docs at offset ${offset}`)
        const snapshot = await getFirestoreInstance().collection(collectionName).limit(batchSize).offset(offset).get()

        snapshot.forEach(fsdoc => {
            let doc = fsdoc.data()
            if (!doc.firestore_id) doc.firestore_id = fsdoc.id
            else if (!doc.firestoreid) doc.firestoreid = fsdoc.id
            else if (!doc.original_id) doc.original_id = fsdoc.id
            else if (!doc.originalid) doc.originalid = fsdoc.id

            if (processDocument) {
                doc = processDocument(collectionName, doc, recordCounters, writeRecordsSync)
            }
            data.push(doc)
        })
        console.log(`    fetched ${data.length} docs`)

        return { data, error: null }
    } catch (error: any) {
        return { data: [], error }
    }
}
