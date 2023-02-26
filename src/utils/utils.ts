import * as admin from "firebase-admin"
import * as fs from "fs"
import { app, auth, firestore, storage } from "firebase-admin"
import App = app.App
import Firestore = firestore.Firestore
import Storage = storage.Storage
import Auth = auth.Auth
import { Client } from "pg"

const serviceAccount = require("../../credentials/firebase-service.json")

export interface RecordCounters {
    [key: string]: number
}

export interface FirestoreDoc {
    [key: string]: any
}

export interface DocumentProcessor {
    (
        collectionName: string,
        doc: FirestoreDoc,
        recordCounters: RecordCounters,
        writeRecord: WriteRecordsSync
    ): FirestoreDoc
}

export function getBucketName(): string {
    return `${serviceAccount.project_id}.appspot.com`
}

// console.log('databaseURL', `https://${serviceAccount.project_id}.firebaseio.com`);

let adminApp: App
function getFirebaseApp() {
    if (!adminApp) {
        try {
            adminApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`, // "https://PROJECTID.firebaseio.com",
                storageBucket: getBucketName(),
            })
        } catch (e) {
            console.error(`Error initializing firebase app`, e)
            process.exit(1)
        }
    }
    return adminApp
}

let dbInstance: Firestore

export function getFirestoreInstance(): admin.firestore.Firestore {
    if (!dbInstance) {
        dbInstance = getFirebaseApp().firestore()
    }
    return dbInstance
}

let storageInstance: Storage
export function getStorageInstance(): admin.storage.Storage {
    if (!storage) {
        storageInstance = getFirebaseApp().storage()
    }
    return storageInstance
}

let authInstance: Auth

export function getAuthInstance(): admin.auth.Auth {
    if (!authInstance) {
        authInstance = getFirebaseApp().auth()
    }
    return authInstance
}

export interface PgCredentials {
    user: string
    password: string
    host: string
    port: number
    database: string
}
export const getPgCredentials = (): PgCredentials => {
    let pgCreds: PgCredentials
    try {
        pgCreds = JSON.parse(fs.readFileSync("../../credentials/supabase-service.json", "utf8"))
        if (
            typeof pgCreds.user === "string" &&
            typeof pgCreds.password === "string" &&
            typeof pgCreds.host === "string" &&
            typeof pgCreds.port === "number" &&
            typeof pgCreds.database === "string"
        ) {
        } else {
            console.log("supabase-service.json must contain the following fields:")
            console.log("   user: string")
            console.log("   password: string")
            console.log("   host: string")
            console.log("   port: number")
            console.log("   database: string")
            process.exit(1)
        }
    } catch (err) {
        console.log("error reading supabase-service.json from credentials/supabase-service.json", err)
        process.exit(1)
    }
    return pgCreds
}

let pgClient: Client
export const getPgClient = async () => {
    const pgCreds = getPgCredentials()
    if (!pgClient) {
        pgClient = new Client({
            user: pgCreds.user,
            host: pgCreds.host,
            database: pgCreds.database,
            password: pgCreds.password,
            port: pgCreds.port,
        })
        await pgClient.connect()
    }
    return pgClient
}

export const getFirestoreCollectionNames = async () => {
    return (await getFirestoreInstance().listCollections()).map(c => c.id)
}
export function removeEmptyFields(obj: any) {
    Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === "object") {
            removeEmptyFields(obj[key])
        } else if (obj[key] === null || obj[key] === "" || obj[key] === " ") {
            delete obj[key]
        }
    })
}

export const deleteIfExists = (filename: string) => {
    fs.rmSync(filename, { force: true })
}

export interface WriteRecordsSync {
    (name: string, doc: FirestoreDoc[], recordCounters: RecordCounters, dirname: string): void
}
export const writeRecordsSync: WriteRecordsSync = (
    name: string,
    docs: FirestoreDoc[],
    recordCounters: { [key: string]: number },
    dirname: string
) => {
    const dirPath = `../../exported/${dirname}`
    const filename = `${dirPath}/${name}.json`

    fs.mkdirSync(dirPath, { recursive: true })
    if (!recordCounters[name] || recordCounters[name] === 0) {
        fs.writeFileSync(filename, "[\n", "utf8")
        recordCounters[name] = 0
    }
    const toAppend = docs
        .map(d => {
            const r = (recordCounters[name] > 0 ? ",\n" : "") + JSON.stringify(d, null, 2)
            recordCounters[name] += 1
            return r
        })
        .join("")
    fs.appendFileSync(filename, toAppend, "utf8")
}
// export const writeRecord: WriteRecord = (name, doc, recordCounters, dirname) => {
//     const dirPath = `../../exported/${dirname}`
//     const filename = `${dirPath}/${name}.json`
//
//     fs.mkdirSync(dirPath, { recursive: true })
//     if (!recordCounters[name] || recordCounters[name] === 0) {
//         fs.writeFileSync(filename, "[\n", "utf8")
//         recordCounters[name] = 0
//     }
//     fs.appendFileSync(filename, (recordCounters[name] > 0 ? ",\n" : "") + JSON.stringify(doc, null, 2), "utf8")
//     recordCounters[name]++
// }
